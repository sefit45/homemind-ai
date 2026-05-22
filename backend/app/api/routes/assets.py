from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_asset_service
from app.domain.ledger import Asset
from app.services.asset_service import AssetService, AssetValidationError

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/", response_model=list[Asset])
async def list_assets(
    user_id: UUID,
    assets: AssetService = Depends(get_asset_service),
) -> list[Asset]:
    try:
        return await assets.list_assets(user_id)
    except AssetValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/", response_model=Asset)
async def create_asset(
    asset: Asset,
    assets: AssetService = Depends(get_asset_service),
) -> Asset:
    try:
        return await assets.create_asset(asset)
    except AssetValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
