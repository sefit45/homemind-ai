from uuid import UUID

from app.domain.ledger import AIInsight
from app.storage.repositories import AIInsightRepository


class AIOrchestrationService:
    def __init__(self, insights: AIInsightRepository) -> None:
        self.insights = insights

    async def list_insights(self, user_id: UUID) -> list[AIInsight]:
        return await self.insights.list_for_user(user_id)

    async def save_insight(self, insight: AIInsight) -> AIInsight:
        return await self.insights.save(insight)

    async def generate_financial_answer(self, user_id: UUID, question: str) -> str:
        # Phase 1 scaffold: prompt orchestration moves here in a later phase.
        raise NotImplementedError("AI orchestration is not implemented yet.")

