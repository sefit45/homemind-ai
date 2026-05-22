import asyncio
from logging.config import fileConfig

from alembic import context

from app.config.settings import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def database_url() -> str:
    settings = get_settings()
    if settings.storage_backend != "postgres" or not settings.database_url:
        raise RuntimeError("Alembic migrations require STORAGE_BACKEND=postgres and DATABASE_URL.")
    if settings.database_url.startswith("postgresql+asyncpg://"):
        return settings.database_url
    return settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)


def run_migrations_offline() -> None:
    context.configure(url=database_url(), literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(database_url(), pool_pre_ping=True)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
