from app.domain.ledger import ImportBatch
from app.storage.repositories import ImportBatchRepository


class ImportService:
    def __init__(self, import_batches: ImportBatchRepository) -> None:
        self.import_batches = import_batches

    async def create_import_batch(self, import_batch: ImportBatch) -> ImportBatch:
        return await self.import_batches.save(import_batch)

    async def enqueue_parse_job(self, import_batch: ImportBatch) -> None:
        # Phase 1 scaffold: queue integration is added in a later phase.
        return None

