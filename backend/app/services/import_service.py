from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from app.domain.enums import ImportBatchStatus, ImportFileType, ImportSourceType
from app.domain.ledger import (
    ImportBatch,
    ImportFileMetadata,
    ImportParseResult,
    ImportValidationError as ImportRowValidationError,
    ImportWarning,
    NormalizedTransactionCandidate,
    Transaction,
)
from app.integrations.import_parsers import DEFAULT_IMPORT_PARSERS
from app.integrations.import_parsers.base import FinancialImportParser, ImportParseContext
from app.security.audit_log import AuditEvent, AuditLog
from app.services.ledger_service import LedgerService, LedgerValidationError
from app.storage.import_files import ImportFileStorage, ImportFileStorageError
from app.storage.repositories import ImportBatchRepository, UserRepository
from app.storage.transactions import NoopTransactionManager, TransactionManager


class ImportValidationError(ValueError):
    pass


class ImportService:
    def __init__(
        self,
        users: UserRepository,
        import_batches: ImportBatchRepository,
        ledger: LedgerService | None = None,
        file_storage: ImportFileStorage | None = None,
        parsers: list[FinancialImportParser] | None = None,
        audit_log: AuditLog | None = None,
        transaction_manager: TransactionManager | None = None,
    ) -> None:
        self.users = users
        self.import_batches = import_batches
        self.ledger = ledger
        self.file_storage = file_storage or ImportFileStorage()
        self.parsers = parsers or DEFAULT_IMPORT_PARSERS
        self.audit_log = audit_log or AuditLog()
        self.transaction_manager = transaction_manager or NoopTransactionManager()

    async def create_import_batch(self, import_batch: ImportBatch) -> ImportBatch:
        user = await self.users.get(import_batch.user_id)
        if not user:
            raise ImportValidationError("User does not exist.")

        if not import_batch.source_type:
            raise ImportValidationError("Import source type is required.")

        import_batch.status = ImportBatchStatus.created
        import_batch.provider = import_batch.provider or import_batch.provider_key or "generic"
        if not self._is_supported_provider(import_batch.provider):
            raise ImportValidationError("Import provider is not supported.")

        saved = await self.import_batches.save(import_batch)
        await self._audit("import_created", saved)
        return saved

    async def list_import_batches(self, user_id):
        user = await self.users.get(user_id)
        if not user:
            raise ImportValidationError("User does not exist.")

        return await self.import_batches.list_for_user(user_id)

    async def get_import_batch(self, import_batch_id: UUID) -> ImportBatch:
        import_batch = await self.import_batches.get(import_batch_id)
        if not import_batch:
            raise ImportValidationError("Import batch does not exist.")

        return import_batch

    async def upload_import_file(
        self,
        import_batch_id: UUID,
        original_filename: str,
        content: bytes,
    ) -> ImportBatch:
        import_batch = await self.get_import_batch(import_batch_id)
        await self._validate_user(import_batch.user_id)

        try:
            metadata = self.file_storage.save(import_batch.id, original_filename, content)
        except ImportFileStorageError as error:
            raise ImportValidationError(str(error)) from error

        import_batch.original_filename = metadata.original_filename
        import_batch.file_type = metadata.file_type
        import_batch.object_storage_key = metadata.storage_key
        import_batch.status = ImportBatchStatus.uploaded
        import_batch.metadata["file_size_bytes"] = metadata.size_bytes
        self._touch(import_batch)

        saved = await self.import_batches.save(import_batch)
        await self._audit("import_file_uploaded", saved)
        return saved

    async def parse_import_batch(
        self,
        import_batch_id: UUID,
        account_id: UUID,
    ) -> ImportParseResult:
        if not self.ledger:
            raise ImportValidationError("Ledger service is not configured for imports.")

        import_batch = await self.get_import_batch(import_batch_id)
        await self._validate_user(import_batch.user_id)
        if not import_batch.object_storage_key or not import_batch.original_filename or not import_batch.file_type:
            raise ImportValidationError("Import batch has no uploaded file.")

        import_batch.status = ImportBatchStatus.parsing
        self._touch(import_batch)
        import_batch = await self.import_batches.save(import_batch)
        await self._audit("import_parse_started", import_batch)

        try:
            metadata = ImportFileMetadata(
                original_filename=import_batch.original_filename,
                file_type=ImportFileType(import_batch.file_type),
                size_bytes=int(import_batch.metadata.get("file_size_bytes", 0)),
                storage_key=import_batch.object_storage_key,
            )
            parser = self._select_parser(metadata, import_batch.provider or import_batch.provider_key)
            content = self.file_storage.read(import_batch.object_storage_key)
            context = ImportParseContext(
                import_batch_id=import_batch.id,
                user_id=import_batch.user_id,
                account_id=account_id,
                source_type=ImportSourceType(import_batch.source_type),
                provider=import_batch.provider or import_batch.provider_key,
            )
            async with self.transaction_manager.transaction():
                rows = parser.parse(content, context, metadata)
                result = await self._process_rows(import_batch, account_id, rows, parser, context)
                await self._audit("import_parse_completed", import_batch)
            return result
        except ImportValidationError:
            import_batch.status = ImportBatchStatus.failed
            self._touch(import_batch)
            await self.import_batches.save(import_batch)
            await self._audit("import_parse_failed", import_batch)
            raise
        except Exception as error:
            import_batch.status = ImportBatchStatus.failed
            import_batch.error_message = str(error)
            self._touch(import_batch)
            await self.import_batches.save(import_batch)
            await self._audit("import_parse_failed", import_batch)
            raise ImportValidationError(str(error)) from error

    async def enqueue_parse_job(self, import_batch: ImportBatch) -> None:
        # Phase 1 scaffold: queue integration is added in a later phase.
        return None

    async def _process_rows(
        self,
        import_batch: ImportBatch,
        account_id: UUID,
        rows,
        parser: FinancialImportParser,
        context: ImportParseContext,
    ) -> ImportParseResult:
        validation_errors: list[ImportRowValidationError] = []
        warnings: list[ImportWarning] = []
        created_transaction_ids: list[UUID] = []
        duplicate_candidate_ids: list[UUID] = []

        for row in rows:
            row_errors = parser.validate_row(row)
            if row_errors:
                validation_errors.extend(row_errors)
                continue

            try:
                candidate = parser.normalize_row(row, context)
                transaction = self._transaction_from_candidate(candidate)
                if await self._is_duplicate_candidate(candidate):
                    transaction.is_duplicate_candidate = True
                saved = await self.ledger.create_transaction(transaction)
                created_transaction_ids.append(saved.id)
                if saved.is_duplicate_candidate:
                    duplicate_candidate_ids.append(saved.id)
                    warnings.append(
                        ImportWarning(
                            row_number=row.row_number,
                            code="duplicate_candidate",
                            message="Transaction matches an existing ledger transaction.",
                        )
                    )
            except (LedgerValidationError, ValueError) as error:
                validation_errors.append(
                    ImportRowValidationError(
                        row_number=row.row_number,
                        message=str(error),
                    )
                )

        imported_count = len(created_transaction_ids)
        rejected_count = len(validation_errors)
        duplicate_count = len(duplicate_candidate_ids)
        status = self._status_for_result(imported_count, rejected_count, duplicate_count)

        import_batch.status = status
        import_batch.total_rows = len(rows)
        import_batch.imported_count = imported_count
        import_batch.rejected_count = rejected_count
        import_batch.duplicate_candidates_count = duplicate_count
        import_batch.imported_transactions = imported_count
        import_batch.rejected_rows = rejected_count
        import_batch.validation_errors = [error.model_dump(mode="json") for error in validation_errors]
        import_batch.warnings = [warning.model_dump(mode="json") for warning in warnings]
        import_batch.created_transaction_ids = created_transaction_ids
        import_batch.duplicate_candidate_ids = duplicate_candidate_ids
        import_batch.metadata["account_id"] = str(account_id)
        self._touch(import_batch)
        await self.import_batches.save(import_batch)

        return ImportParseResult(
            import_batch_id=import_batch.id,
            status=status,
            imported_count=imported_count,
            rejected_count=rejected_count,
            duplicate_candidates_count=duplicate_count,
            validation_errors=validation_errors,
            warnings=warnings,
            created_transaction_ids=created_transaction_ids,
            duplicate_candidate_ids=duplicate_candidate_ids,
            requires_review=status
            in {ImportBatchStatus.requires_review, ImportBatchStatus.partially_imported},
            summary_message=self._summary_message(imported_count, rejected_count, duplicate_count),
        )

    def _select_parser(
        self,
        file_metadata: ImportFileMetadata,
        provider: str | None,
    ) -> FinancialImportParser:
        for parser in self.parsers:
            if parser.can_parse(file_metadata, provider):
                return parser

        raise ImportValidationError("No parser supports this provider and file type.")

    def _is_supported_provider(self, provider: str | None) -> bool:
        normalized_provider = (provider or "generic").strip()
        return normalized_provider == "generic" or any(
            parser.provider_id == normalized_provider for parser in self.parsers
        )

    def _transaction_from_candidate(self, candidate: NormalizedTransactionCandidate) -> Transaction:
        if not candidate.account_id:
            raise ImportValidationError("account_id is required for ledger write.")

        return Transaction(
            user_id=candidate.user_id,
            account_id=candidate.account_id,
            import_batch_id=candidate.import_batch_id,
            source_type=candidate.source_type,
            source_provider=candidate.source_provider,
            transaction_date=candidate.transaction_date,
            amount=candidate.amount,
            currency=candidate.currency or "ILS",
            direction=candidate.direction,
            transaction_type=candidate.transaction_type,
            merchant_raw=candidate.merchant_raw,
            description=candidate.description,
            raw_payload=candidate.raw_payload,
        )

    async def _is_duplicate_candidate(self, candidate: NormalizedTransactionCandidate) -> bool:
        transactions = await self.ledger.list_transactions(candidate.user_id)
        normalized_description = self._normalize_text(candidate.description or candidate.merchant_raw or "")

        for transaction in transactions:
            if transaction.account_id != candidate.account_id:
                continue
            if transaction.transaction_date != candidate.transaction_date:
                continue
            if self._normalize_text(transaction.description or transaction.merchant_raw or "") != normalized_description:
                continue
            if Decimal(transaction.amount) != Decimal(candidate.amount):
                continue
            if (transaction.currency or "ILS").upper() != (candidate.currency or "ILS").upper():
                continue
            return True

        return False

    async def _validate_user(self, user_id: UUID) -> None:
        user = await self.users.get(user_id)
        if not user:
            raise ImportValidationError("User does not exist.")

    async def _audit(self, event_type: str, import_batch: ImportBatch) -> None:
        await self.audit_log.record(
            AuditEvent(
                event_type=event_type,
                user_id=import_batch.user_id,
                resource_type="import_batch",
                resource_id=import_batch.id,
            )
        )

    def _status_for_result(
        self,
        imported_count: int,
        rejected_count: int,
        duplicate_count: int,
    ) -> ImportBatchStatus:
        if imported_count > 0 and rejected_count > 0:
            return ImportBatchStatus.partially_imported
        if imported_count == 0 and rejected_count > 0:
            return ImportBatchStatus.requires_review
        if duplicate_count > 0:
            return ImportBatchStatus.requires_review
        return ImportBatchStatus.parsed

    def _summary_message(
        self,
        imported_count: int,
        rejected_count: int,
        duplicate_count: int,
    ) -> str:
        return (
            f"Imported {imported_count} transactions, rejected {rejected_count} rows, "
            f"flagged {duplicate_count} duplicate candidates."
        )

    def _normalize_text(self, value: str) -> str:
        return " ".join(value.casefold().split())

    def _touch(self, import_batch: ImportBatch) -> None:
        import_batch.updated_at = datetime.now(UTC)
