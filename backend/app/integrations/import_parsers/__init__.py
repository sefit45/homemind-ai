from app.integrations.import_parsers.bank_statement_parser import BankStatementParser
from app.integrations.import_parsers.generic_csv_parser import GenericCsvParser
from app.integrations.import_parsers.max_credit_card_parser import MaxCreditCardParser

DEFAULT_IMPORT_PARSERS = [
    MaxCreditCardParser(),
    BankStatementParser(),
    GenericCsvParser(),
]

