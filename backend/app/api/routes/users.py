from fastapi import APIRouter, HTTPException

from app.domain.ledger import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str) -> User:
    raise HTTPException(status_code=501, detail=f"User API scaffold: {user_id}")

