from app.domain.enums import (
    ImportFileType,
    ImportSourceType,
    TransactionDirection,
    TransactionType,
)
from app.domain.ledger import (
    ImportValidationError,
    NormalizedTransactionCandidate,
    ParsedRawTransaction,
)
from app.integrations.import_parsers.base import ImportParseContext, TabularImportParser


class MaxCreditCardParser(TabularImportParser):
    provider_id = "max"
    supported_file_types = {ImportFileType.xlsx, ImportFileType.xls, ImportFileType.csv}

    def validate_row(self, row: ParsedRawTransaction) -> list[ImportValidationError]:
        raw = row.raw
        transaction_date = self._value(raw, ["transaction_date", "date", "תאריך עסקה", "תאריך"])
        description = self._value(raw, ["merchant", "description", "שם בית עסק", "שם בית העסק"])
        amount = self._value(raw, ["amount", "charge_amount", "סכום חיוב", "סכום"])

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
        amount_value = self._value(raw, ["amount", "charge_amount", "סכום חיוב", "סכום"])
        description = self._normalized_description(
            self._value(raw, ["merchant", "description", "שם בית עסק", "שם בית העסק"])
        )
        direction = self._direction_from_amount(amount_value, TransactionDirection.debit)

        return NormalizedTransactionCandidate(
            row_number=row.row_number,
            user_id=context.user_id,
            account_id=context.account_id,
            import_batch_id=context.import_batch_id,
            source_type=ImportSourceType.credit_card,
            source_provider=context.provider or self.provider_id,
            transaction_date=self._parse_date(
                self._value(raw, ["transaction_date", "date", "תאריך עסקה", "תאריך"])
            ),
            amount=self._parse_amount(amount_value),
            currency=str(self._value(raw, ["currency", "מטבע"]) or "ILS"),
            direction=direction,
            transaction_type=TransactionType.expense
            if direction == TransactionDirection.debit
            else TransactionType.income,
            merchant_raw=description,
            description=description,
            raw_payload=raw,
        )
