from typing import Protocol
from uuid import UUID

from app.domain.ledger import Account, Transaction


class BankingAdapter(Protocol):
    provider_key: str

    async def list_accounts(self, user_id: UUID) -> list[Account]:
        ...

    async def sync_transactions(self, user_id: UUID) -> list[Transaction]:
        ...


class BankingAdapterRegistry:
    def __init__(self) -> None:
        self._adapters: dict[str, BankingAdapter] = {}

    def register(self, adapter: BankingAdapter) -> None:
        self._adapters[adapter.provider_key] = adapter

    def get(self, provider_key: str) -> BankingAdapter | None:
        return self._adapters.get(provider_key)

