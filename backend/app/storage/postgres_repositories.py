from datetime import date, datetime
from decimal import Decimal
from json import dumps
from typing import Any, Generic, TypeVar
from uuid import UUID

from app.domain.ledger import (
    Account,
    AIInsight,
    Asset,
    ImportBatch,
    Institution,
    Liability,
    Transaction,
    User,
)
from app.security.audit_log import AuditEvent
from app.storage.postgres import (
    PostgresConnectionProvider,
    PostgresTransactionManager,
)

ModelT = TypeVar("ModelT")


def _json(value: Any) -> str:
    return dumps(value, default=str)


class PostgresRepository(Generic[ModelT]):
    table_name: str
    id_column: str
    model_class: type[ModelT]
    json_columns: set[str] = set()

    def __init__(self, connection_provider: PostgresConnectionProvider) -> None:
        self.connection_provider = connection_provider

    async def get(self, entity_id: UUID) -> ModelT | None:
        row = await self.connection_provider.fetch_one(
            f"SELECT * FROM {self.table_name} WHERE {self.id_column} = :id",
            {"id": entity_id},
        )
        return self._from_row(row) if row else None

    async def list_for_user(self, user_id: UUID) -> list[ModelT]:
        rows = await self.connection_provider.fetch_all(
            f"SELECT * FROM {self.table_name} WHERE user_id = :user_id ORDER BY created_at",
            {"user_id": user_id},
        )
        return [self._from_row(row) for row in rows]

    async def save(self, entity: ModelT) -> ModelT:
        payload = self._to_row(entity)
        columns = list(payload.keys())
        update_columns = [column for column in columns if column != self.id_column]
        assignments = ", ".join(
            f"{column} = EXCLUDED.{column}" for column in update_columns
        )
        values = ", ".join(
            f"CAST(:{column} AS JSONB)" if column in self.json_columns else f":{column}"
            for column in columns
        )
        sql = (
            f"INSERT INTO {self.table_name} ({', '.join(columns)}) "
            f"VALUES ({values}) ON CONFLICT ({self.id_column}) DO UPDATE SET {assignments}"
        )
        await self.connection_provider.execute(sql, payload)
        return entity

    def _from_row(self, row: dict[str, Any]) -> ModelT:
        payload = dict(row)
        payload["id"] = payload.pop(self.id_column)
        payload.pop("stored_filename", None)
        return self.model_class(**payload)

    def _to_row(self, entity: ModelT) -> dict[str, Any]:
        payload = entity.model_dump(mode="json")
        payload[self.id_column] = payload.pop("id")
        for column in self.json_columns:
            if column in payload:
                payload[column] = _json(payload[column])
        return payload


class PostgresUserRepository(PostgresRepository[User]):
    table_name = "users"
    id_column = "user_id"
    model_class = User

    async def get_by_email(self, email: str) -> User | None:
        row = await self.connection_provider.fetch_one(
            "SELECT * FROM users WHERE lower(email) = lower(:email)",
            {"email": email},
        )
        return self._from_row(row) if row else None


class PostgresInstitutionRepository(PostgresRepository[Institution]):
    table_name = "institutions"
    id_column = "institution_id"
    model_class = Institution
    json_columns = {"metadata"}

    async def list_for_user(self, user_id: UUID) -> list[Institution]:
        rows = await self.connection_provider.fetch_all(
            "SELECT * FROM institutions ORDER BY name",
            {},
        )
        return [self._from_row(row) for row in rows]


class PostgresAccountRepository(PostgresRepository[Account]):
    table_name = "accounts"
    id_column = "account_id"
    model_class = Account
    json_columns = {"metadata"}


class PostgresTransactionRepository(PostgresRepository[Transaction]):
    table_name = "transactions"
    id_column = "transaction_id"
    model_class = Transaction
    json_columns = {"raw_payload"}

    async def list_for_account(self, account_id: UUID) -> list[Transaction]:
        rows = await self.connection_provider.fetch_all(
            "SELECT * FROM transactions WHERE account_id = :account_id ORDER BY transaction_date",
            {"account_id": account_id},
        )
        return [self._from_row(row) for row in rows]


class PostgresAssetRepository(PostgresRepository[Asset]):
    table_name = "assets"
    id_column = "asset_id"
    model_class = Asset
    json_columns = {"metadata"}


class PostgresLiabilityRepository(PostgresRepository[Liability]):
    table_name = "liabilities"
    id_column = "liability_id"
    model_class = Liability
    json_columns = {"metadata"}


class PostgresImportBatchRepository(PostgresRepository[ImportBatch]):
    table_name = "import_batches"
    id_column = "import_batch_id"
    model_class = ImportBatch
    json_columns = {
        "validation_errors",
        "warnings",
        "created_transaction_ids",
        "duplicate_candidate_ids",
        "metadata",
    }


class PostgresAIInsightRepository(PostgresRepository[AIInsight]):
    table_name = "ai_insights"
    id_column = "ai_insight_id"
    model_class = AIInsight
    json_columns = {
        "related_transaction_ids",
        "related_account_ids",
        "evidence",
        "metadata",
    }


class PostgresAuditEventRepository:
    table_name = "audit_events"
    id_column = "audit_event_id"

    def __init__(self, connection_provider: PostgresConnectionProvider) -> None:
        self.connection_provider = connection_provider

    async def list_all(self) -> list[AuditEvent]:
        rows = await self.connection_provider.fetch_all(
            "SELECT * FROM audit_events ORDER BY created_at",
            {},
        )
        return [self._from_row(row) for row in rows]

    async def list_for_user(self, user_id: UUID) -> list[AuditEvent]:
        rows = await self.connection_provider.fetch_all(
            "SELECT * FROM audit_events WHERE user_id = :user_id ORDER BY created_at",
            {"user_id": user_id},
        )
        return [self._from_row(row) for row in rows]

    async def save(self, event: AuditEvent) -> AuditEvent:
        await self.connection_provider.execute(
            """
            INSERT INTO audit_events (
                audit_event_id, user_id, event_type, entity_type, entity_id, metadata, created_at
            ) VALUES (
                :audit_event_id, :user_id, :event_type, :entity_type, :entity_id,
                CAST(:metadata AS JSONB), :created_at
            ) ON CONFLICT (audit_event_id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                event_type = EXCLUDED.event_type,
                entity_type = EXCLUDED.entity_type,
                entity_id = EXCLUDED.entity_id,
                metadata = EXCLUDED.metadata
            """,
            {
                "audit_event_id": event.id,
                "user_id": event.user_id,
                "event_type": event.event_type,
                "entity_type": event.resource_type,
                "entity_id": event.resource_id,
                "metadata": _json(event.metadata),
                "created_at": event.created_at,
            },
        )
        return event

    def _from_row(self, row: dict[str, Any]) -> AuditEvent:
        return AuditEvent(
            id=row["audit_event_id"],
            user_id=row.get("user_id"),
            event_type=row["event_type"],
            resource_type=row.get("entity_type"),
            resource_id=row.get("entity_id"),
            metadata=row.get("metadata") or {},
            created_at=row["created_at"],
        )


class PostgresStore:
    def __init__(self, database_url: str) -> None:
        self.connection_provider = PostgresConnectionProvider(database_url)
        self.users = PostgresUserRepository(self.connection_provider)
        self.institutions = PostgresInstitutionRepository(self.connection_provider)
        self.accounts = PostgresAccountRepository(self.connection_provider)
        self.transactions = PostgresTransactionRepository(self.connection_provider)
        self.assets = PostgresAssetRepository(self.connection_provider)
        self.liabilities = PostgresLiabilityRepository(self.connection_provider)
        self.import_batches = PostgresImportBatchRepository(self.connection_provider)
        self.ai_insights = PostgresAIInsightRepository(self.connection_provider)
        self.audit_events = PostgresAuditEventRepository(self.connection_provider)
        self.transaction_manager = PostgresTransactionManager(self.connection_provider)
