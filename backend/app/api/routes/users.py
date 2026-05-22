from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_store
from app.domain.ledger import User
from app.storage.memory import InMemoryStore

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: UUID,
    store: InMemoryStore = Depends(get_store),
) -> User:
    user = await store.users.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return user


@router.post("/", response_model=User)
async def create_user(
    user: User,
    store: InMemoryStore = Depends(get_store),
) -> User:
    existing = await store.users.get_by_email(user.email)
    if existing:
        raise HTTPException(status_code=409, detail="User email already exists.")

    return await store.users.save(user)
