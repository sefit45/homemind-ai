from datetime import date
from decimal import Decimal
from unittest import IsolatedAsyncioTestCase

from app.domain.enums import (
    AccountType,
    ImportSourceType,
    TransactionDirection,
    TransactionType,
)
from app.domain.ledger import Account, Transaction, User
from app.services.ledger_service import LedgerService, LedgerValidationError
from app.storage.memory import InMemoryStore


class LedgerServiceTest(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.store = InMemoryStore()
        self.ledger = LedgerService(
            users=self.store.users,
            institutions=self.store.institutions,
            accounts=self.store.accounts,
            transactions=self.store.transactions,
        )

        self.user = await self.store.users.save(
            User(email="sefi@example.com", display_name="Sefi")
        )
        self.account = await self.ledger.create_account(
            Account(
                user_id=self.user.id,
                name="Main checking",
                account_type=AccountType.checking,
            )
        )

    async def test_create_transaction_and_cashflow_summary(self):
        await self.ledger.create_transaction(
            Transaction(
                user_id=self.user.id,
                account_id=self.account.id,
                source_type=ImportSourceType.bank_statement,
                transaction_date=date(2026, 5, 1),
                amount=Decimal("10000"),
                direction=TransactionDirection.credit,
                transaction_type=TransactionType.income,
                description="Salary",
            )
        )
        await self.ledger.create_transaction(
            Transaction(
                user_id=self.user.id,
                account_id=self.account.id,
                source_type=ImportSourceType.bank_statement,
                transaction_date=date(2026, 5, 2),
                amount=Decimal("250.50"),
                direction=TransactionDirection.debit,
                transaction_type=TransactionType.expense,
                description="Groceries",
            )
        )

        summary = await self.ledger.calculate_cashflow_summary(self.user.id)

        self.assertEqual(summary["income"], 10000.0)
        self.assertEqual(summary["expenses"], 250.5)
        self.assertEqual(summary["net_cashflow"], 9749.5)
        self.assertEqual(summary["transactions_count"], 2)

    async def test_account_balance_summary_uses_direction(self):
        await self.ledger.create_transaction(
            Transaction(
                user_id=self.user.id,
                account_id=self.account.id,
                source_type=ImportSourceType.bank_statement,
                transaction_date=date(2026, 5, 1),
                amount=Decimal("500"),
                direction=TransactionDirection.credit,
                transaction_type=TransactionType.income,
            )
        )
        await self.ledger.create_transaction(
            Transaction(
                user_id=self.user.id,
                account_id=self.account.id,
                source_type=ImportSourceType.bank_statement,
                transaction_date=date(2026, 5, 2),
                amount=Decimal("125"),
                direction=TransactionDirection.debit,
                transaction_type=TransactionType.expense,
            )
        )

        summary = await self.ledger.get_account_balance_summary(self.user.id)

        self.assertEqual(summary["total_balance"], 375.0)
        self.assertEqual(summary["accounts"][0]["balance"], 375.0)

    async def test_rejects_zero_amount_transaction(self):
        with self.assertRaises(LedgerValidationError):
            await self.ledger.create_transaction(
                Transaction(
                    user_id=self.user.id,
                    account_id=self.account.id,
                    source_type=ImportSourceType.bank_statement,
                    transaction_date=date(2026, 5, 1),
                    amount=Decimal("0"),
                    direction=TransactionDirection.credit,
                    transaction_type=TransactionType.income,
                )
            )

    async def test_rejects_cross_user_account_relation(self):
        other_user = await self.store.users.save(User(email="other@example.com"))

        with self.assertRaises(LedgerValidationError):
            await self.ledger.create_transaction(
                Transaction(
                    user_id=other_user.id,
                    account_id=self.account.id,
                    source_type=ImportSourceType.bank_statement,
                    transaction_date=date(2026, 5, 1),
                    amount=Decimal("100"),
                    direction=TransactionDirection.credit,
                    transaction_type=TransactionType.income,
                )
            )

    async def test_mark_duplicate_and_settlement(self):
        transaction = await self.ledger.create_transaction(
            Transaction(
                user_id=self.user.id,
                account_id=self.account.id,
                source_type=ImportSourceType.bank_statement,
                transaction_date=date(2026, 5, 1),
                amount=Decimal("100"),
                direction=TransactionDirection.debit,
                transaction_type=TransactionType.expense,
            )
        )

        duplicate = await self.ledger.mark_duplicate_candidate(transaction.id)
        settlement = await self.ledger.mark_transaction_as_settlement(transaction.id)

        self.assertTrue(duplicate.is_duplicate_candidate)
        self.assertEqual(settlement.transaction_type, TransactionType.settlement)
        self.assertTrue(settlement.is_excluded_from_cashflow)

