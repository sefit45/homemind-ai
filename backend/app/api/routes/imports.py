from fastapi import APIRouter, HTTPException

from app.domain.ledger import ImportBatch

router = APIRouter(prefix="/imports", tags=["imports"])


@router.get("/", response_model=list[ImportBatch])
async def list_import_batches(user_id: str) -> list[ImportBatch]:
    raise HTTPException(status_code=501, detail=f"Import API scaffold: {user_id}")


@router.post("/", response_model=ImportBatch)
async def create_import_batch(import_batch: ImportBatch) -> ImportBatch:
    raise HTTPException(status_code=501, detail="Import creation scaffold")

