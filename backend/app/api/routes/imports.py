from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_import_service
from app.domain.ledger import ImportBatch
from app.services.import_service import ImportService, ImportValidationError

router = APIRouter(prefix="/imports", tags=["imports"])


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
