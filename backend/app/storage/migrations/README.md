# HomeMindAI Migrations

Phase 5 keeps the existing SQL migration as the source of truth and adds an
Alembic-compatible structure for production migration management.

Local bootstrap, once Postgres dependencies are installed:

```powershell
cd backend
$env:STORAGE_BACKEND="postgres"
$env:DATABASE_URL="postgresql://homemind:homemind@localhost:5432/homemind"
alembic upgrade head
```

For unit tests, leave `STORAGE_BACKEND` unset. Memory mode is the default and
does not require a database.

