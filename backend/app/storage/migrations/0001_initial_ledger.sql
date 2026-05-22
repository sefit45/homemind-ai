-- Initial production-oriented canonical ledger schema.
-- This file is migration-ready SQL, not yet wired to Alembic.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    locale TEXT NOT NULL DEFAULT 'he-IL',
    timezone TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS institutions (
    institution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    institution_type TEXT NOT NULL CHECK (
        institution_type IN ('bank', 'credit_card', 'pension', 'investment', 'manual')
    ),
    country_code TEXT NOT NULL DEFAULT 'IL',
    provider_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(institution_id),
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (
        account_type IN ('checking', 'savings', 'credit_card', 'investment', 'pension', 'loan', 'mortgage', 'other')
    ),
    currency TEXT NOT NULL DEFAULT 'ILS',
    external_account_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_batches (
    import_batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (
        source_type IN (
            'bank', 'credit_card', 'bank_statement', 'credit_card_statement',
            'open_banking', 'manual', 'generic'
        )
    ),
    provider TEXT,
    provider_key TEXT,
    original_filename TEXT,
    stored_filename TEXT,
    object_storage_key TEXT,
    file_type TEXT CHECK (file_type IS NULL OR file_type IN ('xlsx', 'xls', 'csv')),
    status TEXT NOT NULL DEFAULT 'created' CHECK (
        status IN ('created', 'uploaded', 'parsing', 'parsed', 'failed', 'requires_review', 'partially_imported')
    ),
    total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    imported_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
    rejected_count INTEGER NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
    duplicate_candidates_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_candidates_count >= 0),
    imported_transactions INTEGER NOT NULL DEFAULT 0 CHECK (imported_transactions >= 0),
    rejected_rows INTEGER NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
    validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_transaction_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    duplicate_candidate_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(account_id),
    institution_id UUID REFERENCES institutions(institution_id),
    import_batch_id UUID REFERENCES import_batches(import_batch_id),
    external_id TEXT,
    source_type TEXT NOT NULL CHECK (
        source_type IN (
            'bank', 'credit_card', 'bank_statement', 'credit_card_statement',
            'open_banking', 'manual', 'generic'
        )
    ),
    source_provider TEXT,
    transaction_date DATE NOT NULL,
    booking_date DATE,
    value_date DATE,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount <> 0),
    currency TEXT NOT NULL DEFAULT 'ILS',
    direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
    transaction_type TEXT NOT NULL CHECK (
        transaction_type IN ('income', 'expense', 'transfer', 'settlement', 'investment', 'fee', 'unknown')
    ),
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
    asset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    estimated_value NUMERIC(18, 2) NOT NULL CHECK (estimated_value >= 0),
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
    liability_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(account_id),
    name TEXT NOT NULL,
    liability_type TEXT NOT NULL CHECK (
        liability_type IN ('mortgage', 'loan', 'credit_card_debt', 'other')
    ),
    outstanding_amount NUMERIC(18, 2) NOT NULL CHECK (outstanding_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'ILS',
    interest_rate NUMERIC(8, 4),
    maturity_date DATE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_insights (
    ai_insight_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    confidence_score INTEGER CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100),
    related_transaction_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_account_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_name TEXT,
    prompt_version TEXT,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
    audit_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_institutions_provider_key ON institutions(provider_key);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_institution_id ON accounts(institution_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_import_batch_id ON transactions(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_source_provider ON transactions(source_type, source_provider);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_account_id ON liabilities(account_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_provider ON import_batches(provider, source_type);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
