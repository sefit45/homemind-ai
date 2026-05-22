from decimal import Decimal, InvalidOperation

from app.domain.enums import ImportFileType, ImportSourceType, TransactionDirection
from app.domain.ledger import (
    ImportValidationError,
    NormalizedTransactionCandidate,
    ParsedRawTransaction,
)
from app.integrations.import_parsers.base import ImportParseContext, TabularImportParser


class BankStatementParser(TabularImportParser):
    provider_id = "bank_statement"
    supported_file_types = {ImportFileType.xlsx, ImportFileType.xls, ImportFileType.csv}

    def validate_row(self, row: ParsedRawTransaction) -> list[ImportValidationError]:
        raw = row.raw
        transaction_date = self._value(raw, ["transaction_date", "date", "תאריך"])
        description = self._value(raw, ["description", "merchant", "תיאור", "פירוט"])
        amount = self._amount_value(raw)

        errors = self._required_errors(
            row,
            {
                "transaction_date": transaction_date,
                "description": description,
                "amount": amount,
            },
        )

        if amount not in {None, ""}:
            try:
                self._parse_amount(amount)
            except ValueError as error:
                errors.append(
                    ImportValidationError(
                        row_number=row.row_number,
                        field="amount",
                        message=str(error),
                    )
                )

        if transaction_date not in {None, ""}:
            try:
                self._parse_date(transaction_date)
            except ValueError as error:
                errors.append(
                    ImportValidationError(
                        row_number=row.row_number,
                        field="transaction_date",
                        message=str(error),
                    )
                )

        return errors

    def normalize_row(
        self,
        row: ParsedRawTransaction,
        context: ImportParseContext,
    ) -> NormalizedTransactionCandidate:
        raw = row.raw
        amount_value = self._amount_value(raw)
        direction = self._direction(raw, amount_value)
        description = self._normalized_description(
            self._value(raw, ["description", "merchant", "תיאור", "פירוט"])
        )

        return NormalizedTransactionCandidate(
            row_number=row.row_number,
            user_id=context.user_id,
            account_id=context.account_id,
            import_batch_id=context.import_batch_id,
            source_type=ImportSourceType.bank,
            source_provider=context.provider or self.provider_id,
            transaction_date=self._parse_date(
                self._value(raw, ["transaction_date", "date", "תאריך"])
            ),
            amount=self._parse_amount(amount_value),
            currency=str(self._value(raw, ["currency", "מטבע"]) or "ILS"),
            direction=direction,
            transaction_type=self._transaction_type_from_direction(direction),
            merchant_raw=description,
            description=description,
            raw_payload=raw,
        )

    def _amount_value(self, raw):
        direct_amount = self._value(raw, ["amount", "סכום"])
        if direct_amount not in {None, ""}:
            return direct_amount

        debit = self._value(raw, ["debit", "חובה"])
        if debit not in {None, ""}:
            return f"-{debit}"

        credit = self._value(raw, ["credit", "זכות"])
        return credit

    def _direction(self, raw, amount_value) -> TransactionDirection:
        debit = self._value(raw, ["debit", "חובה"])
        credit = self._value(raw, ["credit", "זכות"])
        if debit not in {None, ""}:
            return TransactionDirection.debit
        if credit not in {None, ""}:
            return TransactionDirection.credit

        try:
            return TransactionDirection.credit if Decimal(str(amount_value)) > 0 else TransactionDirection.debit
        except (InvalidOperation, ValueError):
            return TransactionDirection.debit
