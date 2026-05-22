from app.domain.ledger import ImportBatch
from app.storage.repositories import ImportBatchRepository, UserRepository


class ImportValidationError(ValueError):
    pass


class ImportService:
    def __init__(
        self,
        users: UserRepository,
        import_batches: ImportBatchRepository,
    ) -> None:
        self.users = users
        self.import_batches = import_batches

    async def create_import_batch(self, import_batch: ImportBatch) -> ImportBatch:
        user = await self.users.get(import_batch.user_id)
        if not user:
            raise ImportValidationError("User does not exist.")

        if not import_batch.source_type:
            raise ImportValidationError("Import source type is required.")

        return await self.import_batches.save(import_batch)

    async def list_import_batches(self, user_id):
        user = await self.users.get(user_id)
        if not user:
            raise ImportValidationError("User does not exist.")

        return await self.import_batches.list_for_user(user_id)

    async def enqueue_parse_job(self, import_batch: ImportBatch) -> None:
        # Phase 1 scaffold: queue integration is added in a later phase.
        return None
