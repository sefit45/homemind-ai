from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_ledger_service
from app.domain.ledger import Account
from app.services.ledger_service import LedgerService, LedgerValidationError

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[Account])
async def list_accounts(
    user_id: UUID,
    ledger: LedgerService = Depends(get_ledger_service),
) -> list[Account]:
    try:
        return await ledger.list_accounts(user_id)
    except LedgerValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/", response_model=Account)
async def create_account(
    account: Account,
    ledger: LedgerService = Depends(get_ledger_service),
) -> Account:
    try:
        return await ledger.create_account(account)
    except LedgerValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
