from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

if TYPE_CHECKING:
    from app.storage.repositories import AuditEventRepository


@dataclass(frozen=True)
class AuditEvent:
    id: UUID = field(default_factory=uuid4)
    event_type: str = ""
    user_id: UUID | None = None
    resource_type: str | None = None
    resource_id: UUID | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class AuditLog:
    def __init__(
        self,
        repository: "AuditEventRepository | None" = None,
        enabled: bool = True,
    ) -> None:
        self.repository = repository
        self.enabled = enabled

    async def record(self, event: AuditEvent) -> None:
        if not self.enabled or not self.repository:
            return None

        await self.repository.save(event)
        return None
