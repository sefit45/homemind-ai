from dataclasses import dataclass
from os import getenv
from pathlib import Path


class SettingsError(ValueError):
    pass


def _bool_env(name: str, default: bool) -> bool:
    value = getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _list_env(name: str, default: list[str]) -> list[str]:
    value = getenv(name)
    if value is None or not value.strip():
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_env: str = "local"
    storage_backend: str = "memory"
    database_url: str | None = None
    import_storage_dir: Path = Path("backend/.imports")
    max_import_file_size_mb: int = 8
    cors_allowed_origins: list[str] | None = None
    enable_audit_log: bool = True
    enable_ai_calls: bool = False

    @property
    def max_import_file_size_bytes(self) -> int:
        return self.max_import_file_size_mb * 1024 * 1024


def get_settings() -> Settings:
    storage_backend = getenv("STORAGE_BACKEND", "memory").strip().lower()
    database_url = getenv("DATABASE_URL")

    if storage_backend not in {"memory", "postgres"}:
        raise SettingsError("STORAGE_BACKEND must be either 'memory' or 'postgres'.")

    if storage_backend == "postgres" and not database_url:
        raise SettingsError("DATABASE_URL is required when STORAGE_BACKEND=postgres.")

    return Settings(
        app_env=getenv("APP_ENV", "local"),
        storage_backend=storage_backend,
        database_url=database_url,
        import_storage_dir=Path(getenv("IMPORT_STORAGE_DIR", "backend/.imports")),
        max_import_file_size_mb=int(getenv("MAX_IMPORT_FILE_SIZE_MB", "8")),
        cors_allowed_origins=_list_env("CORS_ALLOWED_ORIGINS", ["*"]),
        enable_audit_log=_bool_env("ENABLE_AUDIT_LOG", True),
        enable_ai_calls=_bool_env("ENABLE_AI_CALLS", False),
    )
