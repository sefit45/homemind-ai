from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import (
    AccountType,
    AssetType,
    ImportBatchStatus,
    ImportFileType,
    ImportSourceType,
    InsightType,
    InstitutionType,
    LiabilityType,
    TransactionDirection,
    TransactionType,
)


class DomainModel(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class User(DomainModel):
    email: str
    display_name: str | None = None
    locale: str = "he-IL"
    timezone: str = "Asia/Jerusalem"
    is_active: bool = True


class Institution(DomainModel):
    name: str
    institution_type: InstitutionType
    country_code: str = "IL"
    provider_key: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Account(DomainModel):
    user_id: UUID
    institution_id: UUID | None = None
    name: str
    account_type: AccountType
    currency: str = "ILS"
    external_account_id: str | None = None
    is_active: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class Transaction(DomainModel):
    user_id: UUID
    account_id: UUID | None = None
    institution_id: UUID | None = None
    import_batch_id: UUID | None = None
    external_id: str | None = None
    source_type: ImportSourceType
    source_provider: str | None = None
    transaction_date: date
    booking_date: date | None = None
    value_date: date | None = None
    amount: Decimal
    currency: str = "ILS"
    direction: TransactionDirection
    transaction_type: TransactionType = TransactionType.unknown
    merchant_raw: str | None = None
    merchant_normalized_id: UUID | None = None
    description: str | None = None
    category_id: UUID | None = None
    confidence_score: int | None = Field(default=None, ge=0, le=100)
    requires_review: bool = False
    is_duplicate_candidate: bool = False
    is_excluded_from_cashflow: bool = False
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class Asset(DomainModel):
    user_id: UUID
    name: str
    asset_type: AssetType
    estimated_value: Decimal
    currency: str = "ILS"
    country_code: str | None = None
    description: str | None = None
    valuation_source: str = "manual"
    valuation_date: date | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Liability(DomainModel):
    user_id: UUID
    account_id: UUID | None = None
    name: str
    liability_type: LiabilityType
    outstanding_amount: Decimal
    currency: str = "ILS"
    interest_rate: Decimal | None = None
    maturity_date: date | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ImportBatch(DomainModel):
    user_id: UUID
    source_type: ImportSourceType
    provider: str | None = None
    provider_key: str | None = None
    original_filename: str | None = None
    file_type: ImportFileType | None = None
    object_storage_key: str | None = None
    status: ImportBatchStatus = ImportBatchStatus.created
    total_rows: int = 0
    imported_count: int = 0
    rejected_count: int = 0
    duplicate_candidates_count: int = 0
    imported_transactions: int = 0
    rejected_rows: int = 0
    validation_errors: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[dict[str, Any]] = Field(default_factory=list)
    created_transaction_ids: list[UUID] = Field(default_factory=list)
    duplicate_candidate_ids: list[UUID] = Field(default_factory=list)
    error_message: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AIInsight(DomainModel):
    user_id: UUID
    insight_type: InsightType
    title: str
    body: str
    confidence_score: int | None = Field(default=None, ge=0, le=100)
    related_transaction_ids: list[UUID] = Field(default_factory=list)
    related_account_ids: list[UUID] = Field(default_factory=list)
    model_name: str | None = None
    prompt_version: str | None = None
    evidence: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ImportFileMetadata(BaseModel):
    original_filename: str
    file_type: ImportFileType
    size_bytes: int
    storage_key: str | None = None

    model_config = ConfigDict(use_enum_values=True)


class ImportValidationError(BaseModel):
    message: str
    row_number: int | None = None
    field: str | None = None
    code: str = "validation_error"


class ImportWarning(BaseModel):
    message: str
    row_number: int | None = None
    code: str = "warning"


class ParsedRawTransaction(BaseModel):
    row_number: int
    raw: dict[str, Any]


class NormalizedTransactionCandidate(BaseModel):
    row_number: int
    user_id: UUID
    account_id: UUID
    import_batch_id: UUID
    source_type: ImportSourceType
    source_provider: str | None = None
    transaction_date: date
    amount: Decimal
    currency: str = "ILS"
    direction: TransactionDirection
    transaction_type: TransactionType
    merchant_raw: str | None = None
    description: str
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(use_enum_values=True)


class ImportParseResult(BaseModel):
    import_batch_id: UUID
    status: ImportBatchStatus
    imported_count: int = 0
    rejected_count: int = 0
    duplicate_candidates_count: int = 0
    validation_errors: list[ImportValidationError] = Field(default_factory=list)
    warnings: list[ImportWarning] = Field(default_factory=list)
    created_transaction_ids: list[UUID] = Field(default_factory=list)
    duplicate_candidate_ids: list[UUID] = Field(default_factory=list)
    requires_review: bool = False
    summary_message: str = ""

    model_config = ConfigDict(use_enum_values=True)
