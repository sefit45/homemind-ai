import { Transaction } from "../types/transactions";

const STORAGE_KEY = "homemind_transactions_v1";

function buildTransactionKey(transaction: Transaction): string {
  return [
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

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]): Transaction[] {
  const existing = loadStoredTransactions();

  const existingKeys = new Set(existing.map(buildTransactionKey));

  const newTransactions = transactions.filter((transaction) => {
    const key = buildTransactionKey(transaction);

    if (existingKeys.has(key)) {
      return false;
    }

    existingKeys.add(key);
    return true;
  });

  const merged = [...existing, ...newTransactions];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

  return merged;
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
      const category = transaction.category || "כללי";

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