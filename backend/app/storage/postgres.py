from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, AsyncIterator


class PostgresPersistenceError(RuntimeError):
    pass


@dataclass(frozen=True)
class PostgresSettings:
    database_url: str
    pool_size: int = 5
    max_overflow: int = 10


class PostgresConnectionProvider:
    def __init__(self, database_url: str) -> None:
        if not database_url:
            raise PostgresPersistenceError("DATABASE_URL is required for Postgres storage.")
        self.database_url = database_url

    async def fetch_one(self, sql: str, params: dict[str, Any]) -> dict[str, Any] | None:
        raise PostgresPersistenceError("Postgres driver integration is not wired yet.")

    async def fetch_all(self, sql: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        raise PostgresPersistenceError("Postgres driver integration is not wired yet.")

    async def execute(self, sql: str, params: dict[str, Any]) -> None:
        raise PostgresPersistenceError("Postgres driver integration is not wired yet.")


class PostgresTransactionManager:
    def __init__(self, connection_provider: PostgresConnectionProvider) -> None:
        self.connection_provider = connection_provider

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[None]:
        # Phase 4 structure: replace with a real connection/session transaction
        # when the Postgres driver is wired in Phase 5.
        yield


def get_postgres_settings(database_url: str) -> PostgresSettings:
    return PostgresSettings(database_url=database_url)
