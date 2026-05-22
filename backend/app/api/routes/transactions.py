from fastapi import APIRouter, HTTPException

from app.domain.ledger import Transaction

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[Transaction])
async def list_transactions(user_id: str) -> list[Transaction]:
    raise HTTPException(status_code=501, detail=f"Transaction API scaffold: {user_id}")


@router.post("/", response_model=Transaction)
async def create_transaction(transaction: Transaction) -> Transaction:
    raise HTTPException(status_code=501, detail="Transaction creation scaffold")

