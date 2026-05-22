import os
from datetime import date
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import IsolatedAsyncioTestCase, skipUnless
from uuid import uuid4

from app.domain.enums import (
    AccountType,
    ImportSourceType,
    TransactionDirection,
    TransactionType,
)
from app.domain.ledger import Account, ImportBatch, Transaction, User
from app.security.audit_log import AuditEvent
from app.services.import_service import ImportService
from app.services.ledger_service import LedgerService
from app.storage.import_files import LocalImportFileStorage
from app.storage.postgres import PostgresPersistenceError
from app.storage.postgres_repositories import PostgresStore


def postgres_available() -> bool:
    if not os.getenv("DATABASE_URL"):
        return False
    try:
        import asyncpg  # noqa: F401
        import sqlalchemy  # noqa: F401
    except ImportError:
        return False
    return True


@skipUnless(
    postgres_available(),
    "DATABASE_URL and Postgres async dependencies are required for integration tests.",
)
class PostgresIntegrationTest(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.store = PostgresStore(os.environ["DATABASE_URL"])
        self.user_id = uuid4()
        self.account_id = uuid4()

    async def asyncTearDown(self):
        await self.store.connection_provider.close()

    async def test_async_repository_persistence_and_mapping(self):
        user = await self.store.users.save(
            User(
                id=self.user_id,
                email=f"{self.user_id}@example.com",
                display_name="Postgres User",
            )
        )
        fetched = await self.store.users.get(user.id)

        self.assertEqual(fetched.email, user.email)

    async def test_transaction_commit(self):
        async with self.store.transaction_manager.transaction():
            user = await self.store.users.save(
                User(
                    id=self.user_id,
                    email=f"{self.user_id}@example.com",
                )
            )
            await self.store.accounts.save(
                Account(
                    id=self.account_id,
                    user_id=user.id,
                    name="PG Account",
                    account_type=AccountType.checking,
                )
            )
            await self.store.transactions.save(
                Transaction(
                    user_id=user.id,
                    account_id=self.account_id,
                    source_type=ImportSourceType.bank,
                    transaction_date=date(2026, 5, 1),
                    amount=Decimal("99.25"),
                    direction=TransactionDirection.debit,
                    transaction_type=TransactionType.expense,
                    description="Commit test",
                )
            )

        transactions = await self.store.transactions.list_for_user(self.user_id)
        self.assertEqual(len(transactions), 1)

    async def test_transaction_rollback(self):
        with self.assertRaises(RuntimeError):
            async with self.store.transaction_manager.transaction():
                await self.store.users.save(
                    User(
                        id=self.user_id,
                        email=f"{self.user_id}@example.com",
                    )
                )
                raise RuntimeError("rollback")

        self.assertIsNone(await self.store.users.get(self.user_id))

    async def test_audit_event_persistence(self):
        user = await self.store.users.save(
            User(
                id=self.user_id,
                email=f"{self.user_id}@example.com",
            )
        )
        event = await self.store.audit_events.save(
            AuditEvent(
                user_id=user.id,
                event_type="postgres_integration_test",
                resource_type="user",
                resource_id=user.id,
            )
        )
        events = await self.store.audit_events.list_for_user(user.id)

        self.assertIn(event.id, {item.id for item in events})

    async def test_import_persistence_transactionality(self):
        with TemporaryDirectory() as temp_dir:
            user = await self.store.users.save(
                User(
                    id=self.user_id,
                    email=f"{self.user_id}@example.com",
                )
            )
            account = await self.store.accounts.save(
                Account(
                    id=self.account_id,
                    user_id=user.id,
                    name="Import Account",
                    account_type=AccountType.checking,
                )
            )
            ledger = LedgerService(
                users=self.store.users,
                institutions=self.store.institutions,
                accounts=self.store.accounts,
                transactions=self.store.transactions,
            )
            imports = ImportService(
                users=self.store.users,
                import_batches=self.store.import_batches,
                ledger=ledger,
                file_storage=LocalImportFileStorage(Path(temp_dir)),
                transaction_manager=self.store.transaction_manager,
            )
            batch = await imports.create_import_batch(
                ImportBatch(
                    user_id=user.id,
                    source_type=ImportSourceType.generic,
                    provider="generic",
                )
            )
            uploaded = await imports.upload_import_file(
                batch.id,
                "statement.csv",
                b"date,description,amount\n2026-05-01,PG Import,-15\n",
            )

            result = await imports.parse_import_batch(uploaded.id, account.id)
            persisted_batch = await self.store.import_batches.get(batch.id)
            transactions = await self.store.transactions.list_for_user(user.id)

            self.assertEqual(result.imported_count, 1)
            self.assertEqual(persisted_batch.imported_count, 1)
            self.assertEqual(len(transactions), 1)


class PostgresDependencyTest(IsolatedAsyncioTestCase):
    async def test_missing_database_url_fails_safely(self):
        with self.assertRaises(PostgresPersistenceError):
            PostgresStore("")
