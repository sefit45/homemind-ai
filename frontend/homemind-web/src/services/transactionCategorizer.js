import {
  enrichWithMerchantIntelligence,
  enrichTransactionsWithMerchantIntelligence,
} from "./merchantIntelligenceEngine";

export function categorizeTransaction(transaction) {
  return enrichWithMerchantIntelligence(transaction).aiCategory;
}

export function detectTransactionType(transaction) {
  return enrichWithMerchantIntelligence(transaction).aiType;
}

export function enrichTransaction(transaction) {
  return enrichWithMerchantIntelligence(transaction);
}

export function categorizeTransactions(transactions = []) {
  return enrichTransactionsWithMerchantIntelligence(transactions);
}