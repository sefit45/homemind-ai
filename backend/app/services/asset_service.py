from uuid import UUID

from app.domain.ledger import Asset, Liability
from app.storage.repositories import AssetRepository, LiabilityRepository


class AssetService:
    def __init__(
        self,
        assets: AssetRepository,
        liabilities: LiabilityRepository,
    ) -> None:
        self.assets = assets
        self.liabilities = liabilities

    async def list_assets(self, user_id: UUID) -> list[Asset]:
        return await self.assets.list_for_user(user_id)

    async def list_liabilities(self, user_id: UUID) -> list[Liability]:
        return await self.liabilities.list_for_user(user_id)

