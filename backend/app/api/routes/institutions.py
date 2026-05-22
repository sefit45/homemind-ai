from fastapi import APIRouter, Depends

from app.api.dependencies import get_store
from app.domain.ledger import Institution
from app.storage.memory import InMemoryStore

router = APIRouter(prefix="/institutions", tags=["institutions"])


@router.get("/", response_model=list[Institution])
async def list_institutions(
    store: InMemoryStore = Depends(get_store),
) -> list[Institution]:
    return await store.institutions.list_all()


@router.post("/", response_model=Institution)
async def create_institution(
    institution: Institution,
    store: InMemoryStore = Depends(get_store),
) -> Institution:
    return await store.institutions.save(institution)
