from typing import Protocol
from uuid import UUID

from app.domain.ledger import Transaction


class CreditCardAdapter(Protocol):
    provider_key: str

    async def sync_transactions(self, user_id: UUID) -> list[Transaction]:
        ...


class CreditCardAdapterRegistry:
    def __init__(self) -> None:
        self._adapters: dict[str, CreditCardAdapter] = {}

    def register(self, adapter: CreditCardAdapter) -> None:
        self._adapters[adapter.provider_key] = adapter

    def get(self, provider_key: str) -> CreditCardAdapter | None:
        return self._adapters.get(provider_key)

