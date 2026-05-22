from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_ai_orchestration_service
from app.domain.ledger import AIInsight
from app.services.ai_orchestration_service import (
    AIInsightValidationError,
    AIOrchestrationService,
)

router = APIRouter(prefix="/ai-insights", tags=["ai-insights"])


@router.get("/", response_model=list[AIInsight])
async def list_ai_insights(
    user_id: UUID,
    ai: AIOrchestrationService = Depends(get_ai_orchestration_service),
) -> list[AIInsight]:
    try:
        return await ai.list_insights(user_id)
    except AIInsightValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/", response_model=AIInsight)
async def create_ai_insight(
    insight: AIInsight,
    ai: AIOrchestrationService = Depends(get_ai_orchestration_service),
) -> AIInsight:
    try:
        return await ai.save_insight(insight)
    except AIInsightValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
