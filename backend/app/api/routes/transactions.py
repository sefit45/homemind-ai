from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_ledger_service
from app.domain.ledger import Transaction
from app.services.ledger_service import LedgerService, LedgerValidationError

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[Transaction])
async def list_transactions(
    user_id: UUID,
    ledger: LedgerService = Depends(get_ledger_service),
) -> list[Transaction]:
    try:
        return await ledger.list_transactions(user_id)
    except LedgerValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/", response_model=Transaction)
async def create_transaction(
    transaction: Transaction,
    ledger: LedgerService = Depends(get_ledger_service),
) -> Transaction:
    try:
        return await ledger.create_transaction(transaction)
    except LedgerValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/cashflow-summary")
async def get_cashflow_summary(
    user_id: UUID,
    ledger: LedgerService = Depends(get_ledger_service),
) -> dict[str, object]:
    try:
        return await ledger.calculate_cashflow_summary(user_id)
    except LedgerValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/account-balance-summary")
async def get_account_balance_summary(
    user_id: UUID,
    ledger: LedgerService = Depends(get_ledger_service),
) -> dict[str, object]:
    try:
        return await ledger.get_account_balance_summary(user_id)
    except LedgerValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.patch("/{transaction_id}/duplicate-candidate", response_model=Transaction)
async def mark_duplicate_candidate(
    transaction_id: UUID,
    is_duplicate_candidate: bool = True,
    ledger: LedgerService = Depends(get_ledger_service),
) -> Transaction:
    try:
        return await ledger.mark_duplicate_candidate(
            transaction_id,
            is_duplicate_candidate=is_duplicate_candidate,
        )
    except LedgerValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.patch("/{transaction_id}/transfer", response_model=Transaction)
async def mark_transaction_as_transfer(
    transaction_id: UUID,
    ledger: LedgerService = Depends(get_ledger_service),
) -> Transaction:
    try:
        return await ledger.mark_transaction_as_transfer(transaction_id)
    except LedgerValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.patch("/{transaction_id}/settlement", response_model=Transaction)
async def mark_transaction_as_settlement(
    transaction_id: UUID,
    ledger: LedgerService = Depends(get_ledger_service),
) -> Transaction:
    try:
        return await ledger.mark_transaction_as_settlement(transaction_id)
    except LedgerValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
