import { Transaction } from "../types/transactions";
import {
  getLearnedCategoryForTransaction,
  saveCategoryLearning,
} from "./transactionLearningStore";

const STORAGE_KEY = "homemind_transactions_v1";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function merchantIncludes(transaction: Partial<Transaction>, keywords: string[]) {
  const text = `${clean(transaction.merchant)} ${clean(
    (transaction as any).description
  )}`.toLowerCase();

  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function inferCategoryFromMerchant(transaction: Partial<Transaction>): string {
  if (merchantIncludes(transaction, ["SWAPPEDCOM", "BINANCE", "KRAKEN"])) {
    return "קריפטו והשקעות";
  }

  if (
    merchantIncludes(transaction, [
      "OPENAI",
      "CHATGPT",
      "CLAUDE",
      "ANTHROPIC",
      "BOLT",
      "STACKBLITZ",
      "SHOPIFY",
      "NAME-CHEAP",
      "KSP",
    ])
  ) {
    return "מחשבים וטכנולוגיה";
  }

  if (
    merchantIncludes(transaction, [
      "סופר",
      "רמי לוי",
      "שופרסל",
      "פרשמרקט",
      "מחסני מזון",
      "באבלס",
    ])
  ) {
    return "מזון וצריכה";
  }

  if (merchantIncludes(transaction, ["סופר פארם", "גוד פארם", "מכבידנט"])) {
    return "רפואה ובתי מרקחת";
  }

  if (merchantIncludes(transaction, ["מאפה", "מקדונלד", "מסעד"])) {
    return "מסעדות ובתי קפה";
  }

  if (merchantIncludes(transaction, ["פז", "דלק", "yellow", "ילו"])) {
    return "תחבורה ודלק";
  }

  if (merchantIncludes(transaction, ["דמי כרטיס", "עמלה"])) {
    return "עמלות והעברות";
  }

  if (merchantIncludes(transaction, ["קסטרו"])) {
    return "אופנה";
  }

  if (merchantIncludes(transaction, ["שטראוס מים"])) {
    return "חשמל ותקשורת";
  }

  return "";
}

export function resolveTransactionCategory(
  transaction: Partial<Transaction>
): string {
  const learnedCategory = getLearnedCategoryForTransaction(transaction);

  if (learnedCategory) {
    return learnedCategory;
  }

  const rawCategory =
    (transaction as any).mappedCategory ||
    (transaction as any).aiCategory ||
    (transaction as any).smartCategory ||
    transaction.category ||
    "";

  const category = clean(rawCategory);

  const badCategories = ["", "כללי", "לא מסווג", "לא זוהה", "שונות"];

  if (!badCategories.includes(category)) {
    return category;
  }

  const inferred = inferCategoryFromMerchant(transaction);

  return inferred || "שונות";
}

export function normalizeStoredTransaction(
  transaction: Transaction
): Transaction {
  const resolvedCategory = resolveTransactionCategory(transaction);

  return {
    ...transaction,
    category: resolvedCategory,
    mappedCategory: resolvedCategory,
  } as Transaction;
}

function buildTransactionKey(transaction: Transaction): string {
  return [
    (transaction as any).importFileName,
    (transaction as any).sourceSheet,
    (transaction as any).sourceRow,
    transaction.date,
    transaction.merchant,
    transaction.amount,
    transaction.issuer,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

export function loadStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.map((transaction) => normalizeStoredTransaction(transaction))
      : [];
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]): Transaction[] {
  const existing = loadStoredTransactions();

  const normalizedIncoming = transactions.map((transaction) =>
    normalizeStoredTransaction(transaction)
  );

  const existingKeys = new Set(existing.map(buildTransactionKey));

  const newTransactions = normalizedIncoming.filter((transaction) => {
    const key = buildTransactionKey(transaction);

    if (existingKeys.has(key)) return false;

    existingKeys.add(key);
    return true;
  });

  const merged = [...existing, ...newTransactions];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

  return merged;
}

export function updateStoredTransactionCategory(
  transactionId: string,
  category: string
): Transaction[] {
  const transactions = loadStoredTransactions();

  const updated = transactions.map((transaction) => {
    if (String(transaction.id) !== String(transactionId)) {
      return transaction;
    }

    const merchant =
      transaction.merchant || (transaction as any).description || "";

    saveCategoryLearning(merchant, category);

    return {
      ...transaction,
      category,
      mappedCategory: category,
      userCorrectedCategory: true,
      categoryUpdatedAt: new Date().toISOString(),
    } as Transaction;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  window.dispatchEvent(new Event("homemind:transactions-updated"));

  return updated;
}

export function clearStoredTransactions(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getStoredTransactionStats() {
  const transactions = loadStoredTransactions();

  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const categories = transactions.reduce<Record<string, number>>(
    (acc, transaction) => {
      const category = resolveTransactionCategory(transaction);

      acc[category] = (acc[category] || 0) + Math.abs(transaction.amount);

      return acc;
    },
    {}
  );

  return {
    count: transactions.length,
    income,
    expenses,
    net: income - expenses,
    categories,
  };
}