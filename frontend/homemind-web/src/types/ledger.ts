export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "investment"
  | "pension"
  | "loan"
  | "mortgage"
  | "other";

export type AssetType =
  | "real_estate"
  | "vehicle"
  | "crypto"
  | "cash"
  | "bank_deposit"
  | "securities"
  | "pension"
  | "keren_hishtalmut"
  | "other";

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "settlement"
  | "investment"
  | "fee"
  | "unknown";

export type TransactionDirection = "debit" | "credit";

export interface LedgerUser {
  id: string;
  email: string;
  displayName?: string;
  locale: string;
  timezone: string;
}

export interface LedgerInstitution {
  id: string;
  name: string;
  institutionType: "bank" | "credit_card" | "pension" | "investment" | "manual";
  countryCode: string;
  providerKey?: string;
}

export interface LedgerAccount {
  id: string;
  userId: string;
  institutionId?: string;
  name: string;
  accountType: AccountType;
  currency: string;
  externalAccountId?: string;
  isActive: boolean;
}

export interface LedgerTransaction {
  id: string;
  userId: string;
  accountId?: string;
  institutionId?: string;
  importBatchId?: string;
  externalId?: string;
  sourceType: "bank_statement" | "credit_card_statement" | "open_banking" | "manual";
  sourceProvider?: string;
  transactionDate: string;
  amount: string;
  currency: string;
  direction: TransactionDirection;
  transactionType: TransactionType;
  merchantRaw?: string;
  description?: string;
  categoryId?: string;
  confidenceScore?: number;
  requiresReview: boolean;
  isExcludedFromCashflow: boolean;
}

export interface LedgerAsset {
  id: string;
  userId: string;
  name: string;
  assetType: AssetType;
  estimatedValue: string;
  currency: string;
}

export interface LedgerLiability {
  id: string;
  userId: string;
  accountId?: string;
  name: string;
  liabilityType: "mortgage" | "loan" | "credit_card_debt" | "other";
  outstandingAmount: string;
  currency: string;
}

export interface LedgerImportBatch {
  id: string;
  userId: string;
  sourceType: "bank_statement" | "credit_card_statement" | "open_banking" | "manual";
  providerKey?: string;
  originalFilename?: string;
  status: "pending" | "processing" | "completed" | "failed" | "needs_review";
  totalRows: number;
  importedTransactions: number;
  rejectedRows: number;
}

export interface LedgerAIInsight {
  id: string;
  userId: string;
  insightType: "daily_briefing" | "recommendation" | "anomaly" | "risk" | "explanation";
  title: string;
  body: string;
  confidenceScore?: number;
  evidence: Record<string, unknown>;
}

