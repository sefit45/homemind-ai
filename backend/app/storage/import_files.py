from pathlib import Path
from uuid import UUID, uuid4

from app.domain.enums import ImportFileType
from app.domain.ledger import ImportFileMetadata

MAX_IMPORT_FILE_SIZE_BYTES = 8 * 1024 * 1024
SUPPORTED_IMPORT_EXTENSIONS = {
    ".csv": ImportFileType.csv,
    ".xls": ImportFileType.xls,
    ".xlsx": ImportFileType.xlsx,
}


class ImportFileStorageError(ValueError):
    pass


class ImportFileStorage:
    def __init__(self, upload_root: Path | None = None) -> None:
        self.upload_root = upload_root or Path(__file__).resolve().parents[2] / ".imports"

    def sanitize_filename(self, filename: str) -> str:
        candidate = Path(filename or "").name.strip().replace("\x00", "")
        if not candidate:
            raise ImportFileStorageError("Original filename is required.")

        if candidate != filename or "/" in filename or "\\" in filename:
            raise ImportFileStorageError("Unsafe filenames or paths are not allowed.")

        extension = Path(candidate).suffix.lower()
        if extension not in SUPPORTED_IMPORT_EXTENSIONS:
            raise ImportFileStorageError("Unsupported file extension. Allowed: .xlsx, .xls, .csv.")

        return candidate

    def validate_file(self, filename: str, content: bytes) -> ImportFileMetadata:
        sanitized = self.sanitize_filename(filename)
        if len(content) > MAX_IMPORT_FILE_SIZE_BYTES:
            raise ImportFileStorageError("Import file exceeds the maximum allowed size.")

        extension = Path(sanitized).suffix.lower()
        return ImportFileMetadata(
            original_filename=sanitized,
            file_type=SUPPORTED_IMPORT_EXTENSIONS[extension],
            size_bytes=len(content),
        )

    def save(self, import_batch_id: UUID, filename: str, content: bytes) -> ImportFileMetadata:
        metadata = self.validate_file(filename, content)
        batch_dir = (self.upload_root / str(import_batch_id)).resolve()
        root = self.upload_root.resolve()
        if root not in batch_dir.parents and batch_dir != root:
            raise ImportFileStorageError("Resolved upload path is outside the import directory.")

        batch_dir.mkdir(parents=True, exist_ok=True)
        storage_name = f"{uuid4().hex}.{metadata.file_type}"
        destination = (batch_dir / storage_name).resolve()
        if batch_dir not in destination.parents:
            raise ImportFileStorageError("Resolved file path is outside the import directory.")

        destination.write_bytes(content)
        metadata.storage_key = f"{import_batch_id}/{storage_name}"
        return metadata

    def read(self, storage_key: str) -> bytes:
        destination = (self.upload_root / storage_key).resolve()
        root = self.upload_root.resolve()
        if root not in destination.parents:
            raise ImportFileStorageError("Stored import file path is invalid.")

        return destination.read_bytes()
