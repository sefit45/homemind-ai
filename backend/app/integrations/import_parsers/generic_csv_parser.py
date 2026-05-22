from app.domain.enums import ImportFileType, ImportSourceType
from app.domain.ledger import ImportFileMetadata, NormalizedTransactionCandidate, ParsedRawTransaction
from app.integrations.import_parsers.bank_statement_parser import BankStatementParser
from app.integrations.import_parsers.base import ImportParseContext


class GenericCsvParser(BankStatementParser):
    provider_id = "generic"
    supported_file_types = {ImportFileType.csv}

    def can_parse(self, file_metadata: ImportFileMetadata, provider: str | None) -> bool:
        return file_metadata.file_type == ImportFileType.csv and provider in {None, "", "generic"}

    def normalize_row(
        self,
        row: ParsedRawTransaction,
        context: ImportParseContext,
    ) -> NormalizedTransactionCandidate:
        candidate = super().normalize_row(row, context)
        candidate.source_type = context.source_type or ImportSourceType.generic
        candidate.source_provider = context.provider or self.provider_id
        return candidate
