from contextlib import asynccontextmanager
from contextvars import ContextVar
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
    def __init__(
        self,
        database_url: str,
        pool_size: int = 5,
        max_overflow: int = 10,
    ) -> None:
        if not database_url:
            raise PostgresPersistenceError("DATABASE_URL is required for Postgres storage.")
        self.database_url = database_url
        self._session_context: ContextVar[Any | None] = ContextVar(
            "postgres_session",
            default=None,
        )

        try:
            from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
        except ImportError as error:
            raise PostgresPersistenceError(
                "Postgres storage requires SQLAlchemy[asyncio] and asyncpg. "
                "Install backend requirements before using STORAGE_BACKEND=postgres."
            ) from error

        self.engine = create_async_engine(
            self._async_database_url(database_url),
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_pre_ping=True,
        )
        self.session_factory = async_sessionmaker(
            self.engine,
            expire_on_commit=False,
        )

    async def fetch_one(self, sql: str, params: dict[str, Any]) -> dict[str, Any] | None:
        from sqlalchemy import text

        async with self._session_scope(read_only=True) as session:
            result = await session.execute(text(sql), params)
            row = result.mappings().first()
            return dict(row) if row else None

    async def fetch_all(self, sql: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        from sqlalchemy import text

        async with self._session_scope(read_only=True) as session:
            result = await session.execute(text(sql), params)
            return [dict(row) for row in result.mappings().all()]

    async def execute(self, sql: str, params: dict[str, Any]) -> None:
        from sqlalchemy import text

        async with self._session_scope(read_only=False) as session:
            await session.execute(text(sql), params)

    async def close(self) -> None:
        await self.engine.dispose()

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[None]:
        existing_session = self._session_context.get()
        if existing_session is not None:
            yield
            return

        async with self.session_factory() as session:
            token = self._session_context.set(session)
            try:
                async with session.begin():
                    yield
            finally:
                self._session_context.reset(token)

    @asynccontextmanager
    async def _session_scope(self, read_only: bool) -> AsyncIterator[Any]:
        existing_session = self._session_context.get()
        if existing_session is not None:
            yield existing_session
            return

        async with self.session_factory() as session:
            if read_only:
                yield session
            else:
                async with session.begin():
                    yield session

    def _async_database_url(self, database_url: str) -> str:
        if database_url.startswith("postgresql+asyncpg://"):
            return database_url
        if database_url.startswith("postgresql://"):
            return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return database_url


class PostgresTransactionManager:
    def __init__(self, connection_provider: PostgresConnectionProvider) -> None:
        self.connection_provider = connection_provider

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[None]:
        async with self.connection_provider.transaction():
            yield


def get_postgres_settings(database_url: str) -> PostgresSettings:
    return PostgresSettings(database_url=database_url)
