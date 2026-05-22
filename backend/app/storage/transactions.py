from contextlib import asynccontextmanager
from typing import AsyncIterator, Protocol


class TransactionManager(Protocol):
    def transaction(self) -> AsyncIterator[None]:
        ...


class NoopTransactionManager:
    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[None]:
        yield

