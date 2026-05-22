from datetime import date
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import IsolatedAsyncioTestCase
from uuid import uuid4

from openpyxl import Workbook

from app.domain.enums import (
    AccountType,
    ImportBatchStatus,
    ImportSourceType,
    TransactionDirection,
    TransactionType,
)
from app.domain.ledger import Account, ImportBatch, Transaction, User
from app.services.import_service import ImportService, ImportValidationError
from app.services.ledger_service import LedgerService
from app.storage.import_files import ImportFileStorage
from app.storage.memory import InMemoryStore


class ImportPipelineTest(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = TemporaryDirectory()
        self.store = InMemoryStore()
        self.ledger = LedgerService(
            users=self.store.users,
            institutions=self.store.institutions,
            accounts=self.store.accounts,
            transactions=self.store.transactions,
        )
        self.imports = ImportService(
            users=self.store.users,
            import_batches=self.store.import_batches,
            ledger=self.ledger,
            file_storage=ImportFileStorage(Path(self.temp_dir.name)),
        )
        self.user = await self.store.users.save(User(email="import@example.com"))
        self.account = await self.ledger.create_account(
            Account(
                user_id=self.user.id,
                name="Main",
                account_type=AccountType.checking,
            )
        )

    async def asyncTearDown(self):
        self.temp_dir.cleanup()

    async def test_import_batch_creation(self):
        batch = await self.imports.create_import_batch(
            ImportBatch(
                user_id=self.user.id,
                source_type=ImportSourceType.generic,
                provider="generic",
            )
        )

        self.assertEqual(batch.status, ImportBatchStatus.created)
        self.assertEqual(batch.provider, "generic")

    async def test_upload_rejects_unsupported_extension(self):
        batch = await self._batch()

        with self.assertRaises(ImportValidationError):
            await self.imports.upload_import_file(batch.id, "statement.txt", b"hello")

    async def test_upload_rejects_unsafe_filename(self):
        batch = await self._batch()

        with self.assertRaises(ImportValidationError):
            await self.imports.upload_import_file(batch.id, "../statement.csv", b"hello")

    async def test_parse_fails_cleanly_if_batch_does_not_exist(self):
        with self.assertRaises(ImportValidationError):
            await self.imports.parse_import_batch(uuid4(), self.account.id)

    async def test_parse_fails_cleanly_if_user_does_not_exist(self):
        batch = await self.store.import_batches.save(
            ImportBatch(
                user_id=uuid4(),
                source_type=ImportSourceType.generic,
                provider="generic",
                original_filename="statement.csv",
                object_storage_key="missing/statement.csv",
                file_type="csv",
                status=ImportBatchStatus.uploaded,
            )
        )

        with self.assertRaises(ImportValidationError):
            await self.imports.parse_import_batch(batch.id, self.account.id)

    async def test_invalid_rows_are_rejected_without_crashing_full_import(self):
        batch = await self._uploaded_csv(
            "date,description,amount\n2026-05-01,Salary,100\n2026-05-02,,25\n"
        )

        result = await self.imports.parse_import_batch(batch.id, self.account.id)

        self.assertEqual(result.imported_count, 1)
        self.assertEqual(result.rejected_count, 1)
        self.assertEqual(result.status, ImportBatchStatus.partially_imported)

    async def test_zero_amount_transaction_is_rejected(self):
        batch = await self._uploaded_csv("date,description,amount\n2026-05-01,Zero,0\n")

        result = await self.imports.parse_import_batch(batch.id, self.account.id)

        self.assertEqual(result.imported_count, 0)
        self.assertEqual(result.rejected_count, 1)
        self.assertEqual(result.status, ImportBatchStatus.requires_review)

    async def test_successful_max_like_import_writes_transactions(self):
        batch = await self._uploaded_xlsx(
            provider="max",
            source_type=ImportSourceType.credit_card_statement,
            headers=["transaction_date", "merchant", "amount"],
            rows=[["2026-05-01", "Coffee Shop", "-42.50"]],
        )

        result = await self.imports.parse_import_batch(batch.id, self.account.id)
        transactions = await self.ledger.list_transactions(self.user.id)

        self.assertEqual(result.imported_count, 1)
        self.assertEqual(transactions[0].source_type, ImportSourceType.credit_card)
        self.assertEqual(transactions[0].direction, TransactionDirection.debit)
        self.assertEqual(transactions[0].transaction_type, TransactionType.expense)
        self.assertEqual(transactions[0].amount, Decimal("42.50"))

    async def test_successful_bank_like_import_writes_transactions(self):
        batch = await self._uploaded_xlsx(
            provider="bank_statement",
            source_type=ImportSourceType.bank_statement,
            headers=["date", "description", "debit", "credit"],
            rows=[["2026-05-01", "Groceries", "155.20", ""]],
        )

        result = await self.imports.parse_import_batch(batch.id, self.account.id)
        transactions = await self.ledger.list_transactions(self.user.id)

        self.assertEqual(result.imported_count, 1)
        self.assertEqual(transactions[0].source_type, ImportSourceType.bank)
        self.assertEqual(transactions[0].direction, TransactionDirection.debit)
        self.assertEqual(transactions[0].amount, Decimal("155.20"))

    async def test_duplicate_candidate_is_detected_and_reported(self):
        await self.ledger.create_transaction(
            Transaction(
                user_id=self.user.id,
                account_id=self.account.id,
                source_type=ImportSourceType.bank,
                transaction_date=date(2026, 5, 1),
                amount=Decimal("100"),
                direction=TransactionDirection.debit,
                transaction_type=TransactionType.expense,
                description="Same Merchant",
            )
        )
        batch = await self._uploaded_csv("date,description,amount\n2026-05-01,Same Merchant,-100\n")

        result = await self.imports.parse_import_batch(batch.id, self.account.id)

        self.assertEqual(result.duplicate_candidates_count, 1)
        self.assertEqual(result.status, ImportBatchStatus.requires_review)
        self.assertTrue(result.duplicate_candidate_ids)

    async def test_partial_import_returns_partially_imported_status(self):
        batch = await self._uploaded_csv(
            "date,description,amount\n2026-05-01,Valid,-10\nbad-date,Invalid,-5\n"
        )

        result = await self.imports.parse_import_batch(batch.id, self.account.id)

        self.assertEqual(result.imported_count, 1)
        self.assertEqual(result.rejected_count, 1)
        self.assertEqual(result.status, ImportBatchStatus.partially_imported)

    async def _batch(
        self,
        provider: str = "generic",
        source_type: ImportSourceType = ImportSourceType.generic,
    ) -> ImportBatch:
        return await self.imports.create_import_batch(
            ImportBatch(
                user_id=self.user.id,
                source_type=source_type,
                provider=provider,
            )
        )

    async def _uploaded_csv(self, content: str) -> ImportBatch:
        batch = await self._batch()
        return await self.imports.upload_import_file(
            batch.id,
            "statement.csv",
            content.encode("utf-8"),
        )

    async def _uploaded_xlsx(
        self,
        provider: str,
        source_type: ImportSourceType,
        headers: list[str],
        rows: list[list[str]],
    ) -> ImportBatch:
        batch = await self._batch(provider=provider, source_type=source_type)
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.append(headers)
        for row in rows:
            worksheet.append(row)
        output = BytesIO()
        workbook.save(output)

        return await self.imports.upload_import_file(
            batch.id,
            "statement.xlsx",
            output.getvalue(),
        )
