from datetime import date
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import patch

from app.config.settings import SettingsError, get_settings
from app.domain.enums import (
    AccountType,
    ImportSourceType,
    TransactionDirection,
    TransactionType,
)
from app.domain.ledger import Account, ImportBatch, Transaction, User
from app.security.audit_log import AuditLog
from app.services.import_service import ImportService
from app.services.ledger_service import LedgerService
from app.storage.import_files import LocalImportFileStorage
from app.storage.memory import InMemoryStore
from app.storage.postgres_repositories import PostgresStore
from app.storage.postgres_repositories import PostgresTransactionRepository


class SettingsTest(TestCase):
    def test_settings_default_to_memory(self):
        with patch.dict("os.environ", {}, clear=True):
            settings = get_settings()

        self.assertEqual(settings.storage_backend, "memory")
        self.assertEqual(settings.import_storage_dir, Path("backend/.imports"))

    def test_postgres_mode_without_database_url_fails_clearly(self):
        with patch.dict("os.environ", {"STORAGE_BACKEND": "postgres"}, clear=True):
            with self.assertRaisesRegex(SettingsError, "DATABASE_URL is required"):
                get_settings()

    def test_postgres_store_constructs_with_connection_provider(self):
        class FakeConnectionProvider:
            def __init__(self, database_url: str) -> None:
                self.database_url = database_url

        with patch(
            "app.storage.postgres_repositories.PostgresConnectionProvider",
            FakeConnectionProvider,
        ):
            store = PostgresStore("postgresql://user:pass@localhost:5432/homemind")

        self.assertIsNotNone(store.users)
        self.assertIsNotNone(store.transaction_manager)

    def test_migration_sql_contains_required_core_tables(self):
        migration = Path("app/storage/migrations/0001_initial_ledger.sql").read_text(
            encoding="utf-8"
        )

        for table_name in [
            "users",
            "institutions",
            "accounts",
            "transactions",
            "assets",
            "liabilities",
            "import_batches",
            "ai_insights",
            "audit_events",
        ]:
            self.assertIn(f"CREATE TABLE IF NOT EXISTS {table_name}", migration)

        self.assertIn("idx_transactions_import_batch_id", migration)
        self.assertIn("validation_errors JSONB", migration)
        self.assertIn("audit_event_id UUID PRIMARY KEY", migration)

    def test_migration_bootstrap_files_exist(self):
        self.assertTrue(Path("alembic.ini").exists())
        self.assertTrue(Path("app/storage/migrations/env.py").exists())
        self.assertTrue(Path("app/storage/migrations/versions/0001_initial_ledger.py").exists())
        self.assertTrue(Path("POSTGRES.md").exists())

    def test_postgres_repository_row_domain_mapping(self):
        repository = PostgresTransactionRepository(connection_provider=None)
        transaction = Transaction(
            user_id="00000000-0000-0000-0000-000000000001",
            account_id="00000000-0000-0000-0000-000000000002",
            source_type=ImportSourceType.bank,
            transaction_date=date(2026, 5, 1),
            amount=Decimal("12.50"),
            direction=TransactionDirection.debit,
            transaction_type=TransactionType.expense,
            description="Mapping",
            raw_payload={"nested": ["value"]},
        )

        row = repository._to_row(transaction)
        mapped = repository._from_row({**row, "raw_payload": {"nested": ["value"]}})

        self.assertIn("transaction_id", row)
        self.assertEqual(mapped.id, transaction.id)
        self.assertEqual(mapped.amount, Decimal("12.50"))


class PersistenceBoundaryTest(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = TemporaryDirectory()
        self.store = InMemoryStore()
        self.audit_log = AuditLog(repository=self.store.audit_events, enabled=True)
        self.ledger = LedgerService(
            users=self.store.users,
            institutions=self.store.institutions,
            accounts=self.store.accounts,
            transactions=self.store.transactions,
            audit_log=self.audit_log,
        )
        self.imports = ImportService(
            users=self.store.users,
            import_batches=self.store.import_batches,
            ledger=self.ledger,
            file_storage=LocalImportFileStorage(Path(self.temp_dir.name)),
            audit_log=self.audit_log,
            transaction_manager=self.store.transaction_manager,
        )
        self.user = await self.store.users.save(User(email="phase4@example.com"))
        self.account = await self.ledger.create_account(
            Account(
                user_id=self.user.id,
                name="Main",
                account_type=AccountType.checking,
            )
        )

    async def asyncTearDown(self):
        self.temp_dir.cleanup()

    async def test_memory_repositories_still_work(self):
        users = await self.store.users.list_all()
        accounts = await self.store.accounts.list_for_user(self.user.id)

        self.assertEqual(len(users), 1)
        self.assertEqual(accounts[0].id, self.account.id)

    async def test_ledger_service_works_through_repository_protocols(self):
        transaction = await self.ledger.create_transaction(
            Transaction(
                user_id=self.user.id,
                account_id=self.account.id,
                source_type=ImportSourceType.bank,
                transaction_date=date(2026, 5, 1),
                amount=Decimal("42"),
                direction=TransactionDirection.debit,
                transaction_type=TransactionType.expense,
                description="Protocol payment",
            )
        )

        self.assertEqual(transaction.amount, Decimal("42"))

    async def test_import_pipeline_still_works_in_memory_mode(self):
        batch = await self.imports.create_import_batch(
            ImportBatch(
                user_id=self.user.id,
                source_type=ImportSourceType.generic,
                provider="generic",
            )
        )
        uploaded = await self.imports.upload_import_file(
            batch.id,
            "statement.csv",
            b"date,description,amount\n2026-05-01,Payment,-50\n",
        )
        result = await self.imports.parse_import_batch(uploaded.id, self.account.id)

        self.assertEqual(result.imported_count, 1)

    async def test_audit_events_are_created_for_import_lifecycle(self):
        batch = await self.imports.create_import_batch(
            ImportBatch(
                user_id=self.user.id,
                source_type=ImportSourceType.generic,
                provider="generic",
            )
        )
        uploaded = await self.imports.upload_import_file(
            batch.id,
            "statement.csv",
            b"date,description,amount\n2026-05-01,Payment,-50\n",
        )
        await self.imports.parse_import_batch(uploaded.id, self.account.id)

        events = await self.store.audit_events.list_for_user(self.user.id)
        event_types = {event.event_type for event in events}

        self.assertIn("import_created", event_types)
        self.assertIn("import_file_uploaded", event_types)
        self.assertIn("import_parse_started", event_types)
        self.assertIn("import_parse_completed", event_types)

    async def test_audit_events_are_created_for_transaction_status_changes(self):
        transaction = await self.ledger.create_transaction(
            Transaction(
                user_id=self.user.id,
                account_id=self.account.id,
                source_type=ImportSourceType.bank,
                transaction_date=date(2026, 5, 1),
                amount=Decimal("80"),
                direction=TransactionDirection.debit,
                transaction_type=TransactionType.expense,
                description="Status payment",
            )
        )

        await self.ledger.mark_duplicate_candidate(transaction.id)
        await self.ledger.mark_transaction_as_transfer(transaction.id)
        await self.ledger.mark_transaction_as_settlement(transaction.id)

        events = await self.store.audit_events.list_for_user(self.user.id)
        event_types = {event.event_type for event in events}

        self.assertIn("transaction_created", event_types)
        self.assertIn("transaction_marked_duplicate_candidate", event_types)
        self.assertIn("transaction_marked_transfer", event_types)
        self.assertIn("transaction_marked_settlement", event_types)

    async def test_import_file_storage_rejects_unsafe_filenames(self):
        storage = LocalImportFileStorage(Path(self.temp_dir.name))

        with self.assertRaises(ValueError):
            storage.save(self.account.id, "..\\statement.csv", b"hello")
