export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  issuer: string;
  type: "expense" | "income";
  confidence?: number;
}

export interface ParsedFileResult {
  issuer: string;
  transactions: Transaction[];
}