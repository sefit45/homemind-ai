from uuid import UUID

from app.domain.enums import TransactionType
from app.domain.ledger import Account, Transaction
from app.security.audit_log import AuditEvent, AuditLog
from app.storage.repositories import (
    AccountRepository,
    InstitutionRepository,
    TransactionRepository,
    UserRepository,
)


class LedgerValidationError(ValueError):
    pass


class LedgerService:
    def __init__(
        self,
        users: UserRepository,
        institutions: InstitutionRepository,
        accounts: AccountRepository,
        transactions: TransactionRepository,
        audit_log: AuditLog | None = None,
    ) -> None:
        self.users = users
        self.institutions = institutions
        self.accounts = accounts
        self.transactions = transactions
        self.audit_log = audit_log or AuditLog(enabled=False)

    async def create_account(self, account: Account) -> Account:
        await self._validate_user(account.user_id)

        if account.institution_id:
            institution = await self.institutions.get(account.institution_id)
            if not institution:
                raise LedgerValidationError("Institution does not exist.")

        if not account.currency:
            account.currency = "ILS"

        return await self.accounts.save(account)

    async def list_accounts(self, user_id: UUID) -> list[Account]:
        await self._validate_user(user_id)
        return await self.accounts.list_for_user(user_id)

    async def create_transaction(self, transaction: Transaction) -> Transaction:
        await self._validate_transaction(transaction)
        saved = await self.transactions.save(transaction)
        await self._audit(
            "transaction_created",
            saved.user_id,
            "transaction",
            saved.id,
        )
        return saved

    async def list_transactions(self, user_id: UUID) -> list[Transaction]:
        await self._validate_user(user_id)
        return await self.transactions.list_for_user(user_id)

    async def save_transaction(self, transaction: Transaction) -> Transaction:
        return await self.create_transaction(transaction)

    async def get_account_balance_summary(self, user_id: UUID) -> dict[str, object]:
        await self._validate_user(user_id)
        accounts = await self.accounts.list_for_user(user_id)
        transactions = await self.transactions.list_for_user(user_id)

        balances: dict[UUID, float] = {account.id: 0.0 for account in accounts}

        for transaction in transactions:
            if not transaction.account_id:
                continue

            if transaction.transaction_type in {
                TransactionType.transfer,
                TransactionType.settlement,
            }:
                continue

            multiplier = 1 if transaction.direction == "credit" else -1
            balances[transaction.account_id] = balances.get(transaction.account_id, 0.0) + (
                float(transaction.amount) * multiplier
            )

        return {
            "user_id": user_id,
            "accounts": [
                {
                    "account_id": account.id,
                    "name": account.name,
                    "currency": account.currency,
                    "balance": round(balances.get(account.id, 0.0), 2),
                }
                for account in accounts
            ],
            "total_balance": round(sum(balances.values()), 2),
        }

    async def calculate_cashflow_summary(self, user_id: UUID) -> dict[str, object]:
        await self._validate_user(user_id)
        transactions = await self.transactions.list_for_user(user_id)

        income = 0.0
        expenses = 0.0
        transfers = 0
        settlements = 0

        for transaction in transactions:
            if transaction.is_excluded_from_cashflow:
                continue

            amount = float(abs(transaction.amount))

            if transaction.transaction_type == TransactionType.income:
                income += amount
            elif transaction.transaction_type == TransactionType.expense:
                expenses += amount
            elif transaction.transaction_type == TransactionType.transfer:
                transfers += 1
            elif transaction.transaction_type == TransactionType.settlement:
                settlements += 1

        return {
            "user_id": user_id,
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "net_cashflow": round(income - expenses, 2),
            "transfers": transfers,
            "settlements": settlements,
            "transactions_count": len(transactions),
        }

    async def mark_duplicate_candidate(
        self,
        transaction_id: UUID,
        is_duplicate_candidate: bool = True,
    ) -> Transaction:
        transaction = await self.transactions.get(transaction_id)
        if not transaction:
            raise LedgerValidationError("Transaction does not exist.")

        transaction.is_duplicate_candidate = is_duplicate_candidate
        saved = await self.transactions.save(transaction)
        await self._audit(
            "transaction_marked_duplicate_candidate",
            saved.user_id,
            "transaction",
            saved.id,
        )
        return saved

    async def mark_transaction_as_transfer(self, transaction_id: UUID) -> Transaction:
        return await self._mark_transaction_type(
            transaction_id,
            TransactionType.transfer,
            exclude_from_cashflow=True,
        )

    async def mark_transaction_as_settlement(self, transaction_id: UUID) -> Transaction:
        return await self._mark_transaction_type(
            transaction_id,
            TransactionType.settlement,
            exclude_from_cashflow=True,
        )

    async def _mark_transaction_type(
        self,
        transaction_id: UUID,
        transaction_type: TransactionType,
        exclude_from_cashflow: bool,
    ) -> Transaction:
        transaction = await self.transactions.get(transaction_id)
        if not transaction:
            raise LedgerValidationError("Transaction does not exist.")

        transaction.transaction_type = transaction_type
        transaction.is_excluded_from_cashflow = exclude_from_cashflow
        saved = await self.transactions.save(transaction)
        transaction_type_value = (
            transaction_type.value if hasattr(transaction_type, "value") else str(transaction_type)
        )
        await self._audit(
            f"transaction_marked_{transaction_type_value}",
            saved.user_id,
            "transaction",
            saved.id,
        )
        return saved

    async def _audit(
        self,
        event_type: str,
        user_id: UUID,
        resource_type: str,
        resource_id: UUID,
    ) -> None:
        await self.audit_log.record(
            AuditEvent(
                event_type=event_type,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
            )
        )

    async def _validate_user(self, user_id: UUID) -> None:
        user = await self.users.get(user_id)
        if not user:
            raise LedgerValidationError("User does not exist.")

    async def _validate_transaction(self, transaction: Transaction) -> None:
        await self._validate_user(transaction.user_id)

        if transaction.amount == 0:
            raise LedgerValidationError("Transaction amount cannot be zero.")

        if not transaction.currency:
            transaction.currency = "ILS"

        if not transaction.source_type:
            raise LedgerValidationError("Transaction source type is required.")

        if not transaction.transaction_type or transaction.transaction_type == TransactionType.unknown:
            raise LedgerValidationError("Transaction type is required.")

        if transaction.account_id:
            account = await self.accounts.get(transaction.account_id)
            if not account:
                raise LedgerValidationError("Account does not exist.")

            if account.user_id != transaction.user_id:
                raise LedgerValidationError("Account does not belong to transaction user.")

        if transaction.institution_id:
            institution = await self.institutions.get(transaction.institution_id)
            if not institution:
                raise LedgerValidationError("Institution does not exist.")
