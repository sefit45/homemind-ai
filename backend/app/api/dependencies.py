from functools import lru_cache

from app.config.settings import Settings, get_settings
from app.security.audit_log import AuditLog
from app.services.ai_orchestration_service import AIOrchestrationService
from app.services.asset_service import AssetService
from app.services.import_service import ImportService
from app.services.ledger_service import LedgerService
from app.storage.import_files import LocalImportFileStorage
from app.storage.memory import InMemoryStore
from app.storage.postgres_repositories import PostgresStore


@lru_cache
def get_app_settings() -> Settings:
    return get_settings()


@lru_cache
def get_store():
    settings = get_app_settings()
    if settings.storage_backend == "postgres":
        return PostgresStore(settings.database_url or "")
    return InMemoryStore()


def get_audit_log() -> AuditLog:
    settings = get_app_settings()
    store = get_store()
    return AuditLog(
        repository=store.audit_events,
        enabled=settings.enable_audit_log,
    )


def get_ledger_service() -> LedgerService:
    store = get_store()
    return LedgerService(
        users=store.users,
        institutions=store.institutions,
        accounts=store.accounts,
        transactions=store.transactions,
        audit_log=get_audit_log(),
    )


def get_asset_service() -> AssetService:
    store = get_store()
    return AssetService(
        users=store.users,
        assets=store.assets,
        liabilities=store.liabilities,
    )


def get_import_service() -> ImportService:
    settings = get_app_settings()
    store = get_store()
    return ImportService(
        users=store.users,
        import_batches=store.import_batches,
        ledger=get_ledger_service(),
        file_storage=LocalImportFileStorage(
            upload_root=settings.import_storage_dir,
            max_size_bytes=settings.max_import_file_size_bytes,
        ),
        audit_log=get_audit_log(),
        transaction_manager=store.transaction_manager,
    )


def get_ai_orchestration_service() -> AIOrchestrationService:
    store = get_store()
    return AIOrchestrationService(
        users=store.users,
        insights=store.ai_insights,
    )
