from fastapi import APIRouter, HTTPException

from app.domain.ledger import Asset

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/", response_model=list[Asset])
async def list_assets(user_id: str) -> list[Asset]:
    raise HTTPException(status_code=501, detail=f"Asset API scaffold: {user_id}")

