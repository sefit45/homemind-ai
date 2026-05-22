from fastapi import APIRouter, HTTPException

from app.domain.ledger import Institution

router = APIRouter(prefix="/institutions", tags=["institutions"])


@router.get("/", response_model=list[Institution])
async def list_institutions() -> list[Institution]:
    raise HTTPException(status_code=501, detail="Institution API scaffold")

