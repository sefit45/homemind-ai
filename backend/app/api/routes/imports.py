from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.api.dependencies import get_import_service
from app.domain.ledger import ImportBatch, ImportParseResult
from app.services.import_service import ImportService, ImportValidationError

router = APIRouter(prefix="/imports", tags=["imports"])


class ParseImportRequest(BaseModel):
    account_id: UUID


@router.get("/", response_model=list[ImportBatch])
async def list_import_batches(
    user_id: UUID,
    imports: ImportService = Depends(get_import_service),
) -> list[ImportBatch]:
    try:
        return await imports.list_import_batches(user_id)
    except ImportValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/", response_model=ImportBatch)
async def create_import_batch(
    import_batch: ImportBatch,
    imports: ImportService = Depends(get_import_service),
) -> ImportBatch:
    try:
        return await imports.create_import_batch(import_batch)
    except ImportValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/{import_batch_id}", response_model=ImportBatch)
async def get_import_batch(
    import_batch_id: UUID,
    imports: ImportService = Depends(get_import_service),
) -> ImportBatch:
    try:
        return await imports.get_import_batch(import_batch_id)
    except ImportValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/{import_batch_id}/upload", response_model=ImportBatch)
async def upload_import_file(
    import_batch_id: UUID,
    request: Request,
    imports: ImportService = Depends(get_import_service),
) -> ImportBatch:
    try:
        form = await request.form()
        upload = form.get("file")
        if not upload or not hasattr(upload, "filename"):
            raise ImportValidationError("Multipart field 'file' is required.")

        content = await upload.read()
        return await imports.upload_import_file(import_batch_id, upload.filename, content)
    except ImportValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/{import_batch_id}/parse", response_model=ImportParseResult)
async def parse_import_batch(
    import_batch_id: UUID,
    request: ParseImportRequest,
    imports: ImportService = Depends(get_import_service),
) -> ImportParseResult:
    try:
        return await imports.parse_import_batch(import_batch_id, request.account_id)
    except ImportValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
