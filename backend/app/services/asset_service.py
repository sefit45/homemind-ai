from uuid import UUID

from app.domain.ledger import Asset, Liability
from app.storage.repositories import AssetRepository, LiabilityRepository, UserRepository


class AssetValidationError(ValueError):
    pass


class AssetService:
    def __init__(
        self,
        users: UserRepository,
        assets: AssetRepository,
        liabilities: LiabilityRepository,
    ) -> None:
        self.users = users
        self.assets = assets
        self.liabilities = liabilities

    async def create_asset(self, asset: Asset) -> Asset:
        await self._validate_user(asset.user_id)

        if asset.estimated_value < 0:
            raise AssetValidationError("Asset value cannot be negative.")

        if not asset.currency:
            asset.currency = "ILS"

        return await self.assets.save(asset)

    async def list_assets(self, user_id: UUID) -> list[Asset]:
        await self._validate_user(user_id)
        return await self.assets.list_for_user(user_id)

    async def create_liability(self, liability: Liability) -> Liability:
        await self._validate_user(liability.user_id)

        if liability.outstanding_amount < 0:
            raise AssetValidationError("Liability amount cannot be negative.")

        if not liability.currency:
            liability.currency = "ILS"

        return await self.liabilities.save(liability)

    async def list_liabilities(self, user_id: UUID) -> list[Liability]:
        await self._validate_user(user_id)
        return await self.liabilities.list_for_user(user_id)

    async def _validate_user(self, user_id: UUID) -> None:
        user = await self.users.get(user_id)
        if not user:
            raise AssetValidationError("User does not exist.")
