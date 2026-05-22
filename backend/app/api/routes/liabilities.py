from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_asset_service
from app.domain.ledger import Liability
from app.services.asset_service import AssetService, AssetValidationError

router = APIRouter(prefix="/liabilities", tags=["liabilities"])


@router.get("/", response_model=list[Liability])
async def list_liabilities(
    user_id: UUID,
    assets: AssetService = Depends(get_asset_service),
) -> list[Liability]:
    try:
        return await assets.list_liabilities(user_id)
    except AssetValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/", response_model=Liability)
async def create_liability(
    liability: Liability,
    assets: AssetService = Depends(get_asset_service),
) -> Liability:
    try:
        return await assets.create_liability(liability)
    except AssetValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
