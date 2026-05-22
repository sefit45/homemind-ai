from copy import deepcopy
from typing import Generic, TypeVar
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

ModelT = TypeVar("ModelT")


class InMemoryRepository(Generic[ModelT]):
    def __init__(self) -> None:
        self._items: dict[UUID, ModelT] = {}

    async def get(self, entity_id: UUID) -> ModelT | None:
        item = self._items.get(entity_id)
        return deepcopy(item) if item else None

    async def list_all(self) -> list[ModelT]:
        return [deepcopy(item) for item in self._items.values()]

    async def list_for_user(self, user_id: UUID) -> list[ModelT]:
        return [
            deepcopy(item)
            for item in self._items.values()
            if getattr(item, "user_id", None) == user_id
        ]

    async def save(self, entity: ModelT) -> ModelT:
        self._items[getattr(entity, "id")] = deepcopy(entity)
        return deepcopy(entity)

    def clear(self) -> None:
        self._items.clear()


class InMemoryUserRepository(InMemoryRepository[User]):
    async def list_for_user(self, user_id: UUID) -> list[User]:
        user = await self.get(user_id)
        return [user] if user else []

    async def get_by_email(self, email: str) -> User | None:
        normalized_email = email.strip().lower()

        for user in self._items.values():
            if user.email.strip().lower() == normalized_email:
                return deepcopy(user)

        return None


class InMemoryInstitutionRepository(InMemoryRepository[Institution]):
    async def list_for_user(self, user_id: UUID) -> list[Institution]:
        return await self.list_all()


class InMemoryAccountRepository(InMemoryRepository[Account]):
    pass


class InMemoryTransactionRepository(InMemoryRepository[Transaction]):
    async def list_for_account(self, account_id: UUID) -> list[Transaction]:
        return [
            deepcopy(item)
            for item in self._items.values()
            if item.account_id == account_id
        ]


class InMemoryAssetRepository(InMemoryRepository[Asset]):
    pass


class InMemoryLiabilityRepository(InMemoryRepository[Liability]):
    pass


class InMemoryImportBatchRepository(InMemoryRepository[ImportBatch]):
    pass


class InMemoryAIInsightRepository(InMemoryRepository[AIInsight]):
    pass


class InMemoryStore:
    def __init__(self) -> None:
        self.users = InMemoryUserRepository()
        self.institutions = InMemoryInstitutionRepository()
        self.accounts = InMemoryAccountRepository()
        self.transactions = InMemoryTransactionRepository()
        self.assets = InMemoryAssetRepository()
        self.liabilities = InMemoryLiabilityRepository()
        self.import_batches = InMemoryImportBatchRepository()
        self.ai_insights = InMemoryAIInsightRepository()

    def clear(self) -> None:
        self.users.clear()
        self.institutions.clear()
        self.accounts.clear()
        self.transactions.clear()
        self.assets.clear()
        self.liabilities.clear()
        self.import_batches.clear()
        self.ai_insights.clear()

