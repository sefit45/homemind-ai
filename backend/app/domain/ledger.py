from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import (
    AccountType,
    AssetType,
    ImportBatchStatus,
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
    provider_key: str | None = None
    original_filename: str | None = None
    object_storage_key: str | None = None
    status: ImportBatchStatus = ImportBatchStatus.pending
    total_rows: int = 0
    imported_transactions: int = 0
    rejected_rows: int = 0
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
