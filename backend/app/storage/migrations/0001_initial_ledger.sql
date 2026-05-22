-- Initial canonical ledger schema draft.
-- This file is intentionally migration-ready SQL, not yet wired to Alembic.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    locale TEXT NOT NULL DEFAULT 'he-IL',
    timezone TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    institution_type TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'IL',
    provider_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    institution_id UUID REFERENCES institutions(id),
    name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ILS',
    external_account_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    source_type TEXT NOT NULL,
    provider_key TEXT,
    original_filename TEXT,
    object_storage_key TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_transactions INTEGER NOT NULL DEFAULT 0,
    rejected_rows INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    account_id UUID REFERENCES accounts(id),
    institution_id UUID REFERENCES institutions(id),
    import_batch_id UUID REFERENCES import_batches(id),
    external_id TEXT,
    source_type TEXT NOT NULL,
    source_provider TEXT,
    transaction_date DATE NOT NULL,
    booking_date DATE,
    value_date DATE,
    amount NUMERIC(18, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ILS',
    direction TEXT NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'unknown',
    merchant_raw TEXT,
    merchant_normalized_id UUID,
    description TEXT,
    category_id UUID,
    confidence_score INTEGER CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100),
    requires_review BOOLEAN NOT NULL DEFAULT FALSE,
    is_duplicate_candidate BOOLEAN NOT NULL DEFAULT FALSE,
    is_excluded_from_cashflow BOOLEAN NOT NULL DEFAULT FALSE,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    estimated_value NUMERIC(18, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ILS',
    country_code TEXT,
    description TEXT,
    valuation_source TEXT NOT NULL DEFAULT 'manual',
    valuation_date DATE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS liabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    account_id UUID REFERENCES accounts(id),
    name TEXT NOT NULL,
    liability_type TEXT NOT NULL,
    outstanding_amount NUMERIC(18, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ILS',
    interest_rate NUMERIC(8, 4),
    maturity_date DATE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    confidence_score INTEGER CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100),
    related_transaction_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    related_account_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    model_name TEXT,
    prompt_version TEXT,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);

