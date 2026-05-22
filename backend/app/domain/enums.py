from enum import Enum


class AccountType(str, Enum):
    checking = "checking"
    savings = "savings"
    credit_card = "credit_card"
    investment = "investment"
    pension = "pension"
    loan = "loan"
    mortgage = "mortgage"
    other = "other"


class AssetType(str, Enum):
    real_estate = "real_estate"
    vehicle = "vehicle"
    crypto = "crypto"
    cash = "cash"
    bank_deposit = "bank_deposit"
    securities = "securities"
    pension = "pension"
    keren_hishtalmut = "keren_hishtalmut"
    other = "other"


class ImportBatchStatus(str, Enum):
    created = "created"
    uploaded = "uploaded"
    parsing = "parsing"
    parsed = "parsed"
    failed = "failed"
    requires_review = "requires_review"
    partially_imported = "partially_imported"
    pending = "created"
    processing = "parsing"
    completed = "parsed"
    needs_review = "requires_review"


class ImportSourceType(str, Enum):
    bank = "bank"
    credit_card = "credit_card"
    bank_statement = "bank_statement"
    credit_card_statement = "credit_card_statement"
    open_banking = "open_banking"
    manual = "manual"
    generic = "generic"


class ImportFileType(str, Enum):
    csv = "csv"
    xls = "xls"
    xlsx = "xlsx"


class InsightType(str, Enum):
    daily_briefing = "daily_briefing"
    recommendation = "recommendation"
    anomaly = "anomaly"
    risk = "risk"
    explanation = "explanation"


class InstitutionType(str, Enum):
    bank = "bank"
    credit_card = "credit_card"
    pension = "pension"
    investment = "investment"
    manual = "manual"


class LiabilityType(str, Enum):
    mortgage = "mortgage"
    loan = "loan"
    credit_card_debt = "credit_card_debt"
    other = "other"


class TransactionDirection(str, Enum):
    debit = "debit"
    credit = "credit"


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"
    transfer = "transfer"
    settlement = "settlement"
    investment = "investment"
    fee = "fee"
    unknown = "unknown"
