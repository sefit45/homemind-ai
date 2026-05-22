from fastapi import APIRouter, HTTPException

from app.domain.ledger import Account

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[Account])
async def list_accounts(user_id: str) -> list[Account]:
    raise HTTPException(status_code=501, detail=f"Account API scaffold: {user_id}")

