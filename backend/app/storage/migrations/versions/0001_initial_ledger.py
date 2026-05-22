"""initial canonical ledger schema

Revision ID: 0001_initial_ledger
Revises:
Create Date: 2026-05-22
"""

from pathlib import Path

from alembic import op
from sqlalchemy import text

revision = "0001_initial_ledger"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    migration_sql = Path(__file__).resolve().parents[1] / "0001_initial_ledger.sql"
    connection = op.get_bind()
    for statement in migration_sql.read_text(encoding="utf-8").split(";"):
        statement = statement.strip()
        if statement:
            connection.execute(text(statement))


def downgrade() -> None:
    for table_name in [
        "audit_events",
        "ai_insights",
        "liabilities",
        "assets",
        "transactions",
        "import_batches",
        "accounts",
        "institutions",
        "users",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE")
