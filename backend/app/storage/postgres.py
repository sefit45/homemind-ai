from dataclasses import dataclass
from os import getenv


@dataclass(frozen=True)
class PostgresSettings:
    database_url: str
    pool_size: int = 5
    max_overflow: int = 10


def get_postgres_settings() -> PostgresSettings:
    return PostgresSettings(
        database_url=getenv(
            "DATABASE_URL",
            "postgresql://homemind:homemind@localhost:5432/homemind",
        )
    )

