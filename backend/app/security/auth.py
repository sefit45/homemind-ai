from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: UUID
    email: str
    roles: tuple[str, ...] = ("user",)


async def get_current_user() -> AuthenticatedUser:
    # Phase 1 scaffold: replace with OAuth/OIDC verification later.
    raise NotImplementedError("Authentication is not wired yet.")

