from uuid import UUID

from app.domain.ledger import Account, Transaction
from app.storage.repositories import AccountRepository, TransactionRepository


class LedgerService:
    def __init__(
        self,
        accounts: AccountRepository,
        transactions: TransactionRepository,
    ) -> None:
        self.accounts = accounts
        self.transactions = transactions

    async def list_accounts(self, user_id: UUID) -> list[Account]:
        return await self.accounts.list_for_user(user_id)

    async def list_transactions(self, user_id: UUID) -> list[Transaction]:
        return await self.transactions.list_for_user(user_id)

    async def save_transaction(self, transaction: Transaction) -> Transaction:
        return await self.transactions.save(transaction)

