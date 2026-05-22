from typing import Generic, Protocol, TypeVar
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

ModelT = TypeVar("ModelT")


class Repository(Protocol, Generic[ModelT]):
    async def get(self, entity_id: UUID) -> ModelT | None:
        ...

    async def list_for_user(self, user_id: UUID) -> list[ModelT]:
        ...

    async def save(self, entity: ModelT) -> ModelT:
        ...


class UserRepository(Repository[User], Protocol):
    async def get_by_email(self, email: str) -> User | None:
        ...


class InstitutionRepository(Repository[Institution], Protocol):
    pass


class AccountRepository(Repository[Account], Protocol):
    pass


class TransactionRepository(Repository[Transaction], Protocol):
    async def list_for_account(self, account_id: UUID) -> list[Transaction]:
        ...


class AssetRepository(Repository[Asset], Protocol):
    pass


class LiabilityRepository(Repository[Liability], Protocol):
    pass


class ImportBatchRepository(Repository[ImportBatch], Protocol):
    pass


class AIInsightRepository(Repository[AIInsight], Protocol):
    pass


class AuditEventRepository(Protocol):
    async def list_all(self) -> list[AuditEvent]:
        ...

    async def list_for_user(self, user_id: UUID) -> list[AuditEvent]:
        ...

    async def save(self, event: AuditEvent) -> AuditEvent:
        ...
