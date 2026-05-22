from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4


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
    async def record(self, event: AuditEvent) -> None:
        # Phase 1 scaffold: persist to audit_events in a later phase.
        return None
