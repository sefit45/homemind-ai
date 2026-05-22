from fastapi import APIRouter

from app.api.routes import (
    accounts,
    ai_insights,
    assets,
    imports,
    institutions,
    liabilities,
    transactions,
    users,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(users.router)
api_router.include_router(institutions.router)
api_router.include_router(accounts.router)
api_router.include_router(transactions.router)
api_router.include_router(assets.router)
api_router.include_router(liabilities.router)
api_router.include_router(imports.router)
api_router.include_router(ai_insights.router)

