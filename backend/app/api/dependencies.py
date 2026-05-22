from app.services.ai_orchestration_service import AIOrchestrationService
from app.services.asset_service import AssetService
from app.services.import_service import ImportService
from app.services.ledger_service import LedgerService
from app.storage.memory import InMemoryStore

store = InMemoryStore()


def get_store() -> InMemoryStore:
    return store


def get_ledger_service() -> LedgerService:
    return LedgerService(
        users=store.users,
        institutions=store.institutions,
        accounts=store.accounts,
        transactions=store.transactions,
    )


def get_asset_service() -> AssetService:
    return AssetService(
        users=store.users,
        assets=store.assets,
        liabilities=store.liabilities,
    )


def get_import_service() -> ImportService:
    return ImportService(
        users=store.users,
        import_batches=store.import_batches,
        ledger=get_ledger_service(),
    )


def get_ai_orchestration_service() -> AIOrchestrationService:
    return AIOrchestrationService(
        users=store.users,
        insights=store.ai_insights,
    )
