from fastapi import APIRouter, HTTPException

from app.domain.ledger import Liability

router = APIRouter(prefix="/liabilities", tags=["liabilities"])


@router.get("/", response_model=list[Liability])
async def list_liabilities(user_id: str) -> list[Liability]:
    raise HTTPException(status_code=501, detail=f"Liability API scaffold: {user_id}")

