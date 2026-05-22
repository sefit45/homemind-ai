# HomeMindAI Postgres Mode

Memory storage remains the default. Postgres mode is opt-in.

Install backend dependencies:

```powershell
cd backend
python -m pip install -r requirements.txt
```

Start a local database:

```powershell
docker compose -f docker-compose.postgres.yml up -d
```

Run migrations:

```powershell
$env:STORAGE_BACKEND="postgres"
$env:DATABASE_URL="postgresql://homemind:homemind@localhost:5432/homemind"
alembic upgrade head
```

Run the backend in Postgres mode:

```powershell
$env:STORAGE_BACKEND="postgres"
$env:DATABASE_URL="postgresql://homemind:homemind@localhost:5432/homemind"
uvicorn main:app --reload
```

Run optional Postgres integration tests:

```powershell
$env:DATABASE_URL="postgresql://homemind:homemind@localhost:5432/homemind"
python -m unittest tests.test_postgres_integration
```

Do not commit real credentials. The example values are for local development only.

