from fastapi import APIRouter, HTTPException

from app.domain.ledger import AIInsight

router = APIRouter(prefix="/ai-insights", tags=["ai-insights"])


@router.get("/", response_model=list[AIInsight])
async def list_ai_insights(user_id: str) -> list[AIInsight]:
    raise HTTPException(status_code=501, detail=f"AI insight API scaffold: {user_id}")

