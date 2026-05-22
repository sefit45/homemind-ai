export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  issuer: string;
  type: "expense" | "income" | "transfer";
  confidence?: number;
  description?: string;
  mappedCategory?: string;
  aiCategory?: string;
  source?: string;
  sourceSheet?: string;
  sourceRow?: number;
  importFileName?: string;
  importMonth?: number | null;
  importYear?: number | null;
  balance?: number;
  reference?: string;
  userCorrectedCategory?: boolean;
  userCorrectedType?: boolean;
  excludeFromTrueExpenses?: boolean;
  needsReview?: boolean;
  aiConfidence?: number;
}

export interface ParsedFileResult {
  issuer: string;
  transactions: Transaction[];
}
