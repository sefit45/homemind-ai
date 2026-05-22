from dataclasses import dataclass


@dataclass(frozen=True)
class MerchantMatch:
    merchant_raw: str
    merchant_normalized: str
    category_hint: str | None = None
    confidence_score: int = 0


class MerchantIntelligenceService:
    async def normalize_merchant(self, merchant_raw: str) -> MerchantMatch:
        # Phase 1 scaffold: frontend merchant rules will migrate here later.
        return MerchantMatch(
            merchant_raw=merchant_raw,
            merchant_normalized=merchant_raw.strip(),
            confidence_score=0,
        )

