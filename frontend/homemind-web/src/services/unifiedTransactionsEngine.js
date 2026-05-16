import { loadStoredTransactions } from "./transactionStore";
import { loadBankTransactions } from "./bankTransactionsStore";
import { categorizeTransactions } from "./transactionCategorizer";

export function getAllUnifiedTransactions() {
  const creditTransactions = loadStoredTransactions() || [];
  const bankTransactions = loadBankTransactions() || [];

  const all = [...creditTransactions, ...bankTransactions];

  return categorizeTransactions(all)
    .filter((tx) => tx && tx.amount)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function calculateUnifiedCashflow() {
  const transactions = getAllUnifiedTransactions();

  let income = 0;
  let expenses = 0;

  transactions.forEach((tx) => {
    const amount = Number(tx.amount || 0);

    if (amount > 0) {
      income += amount;
    } else {
      expenses += Math.abs(amount);
    }
  });

  return {
    income,
    expenses,
    net: income - expenses,
    transactionsCount: transactions.length,
  };
}

export function detectRecurringTransactions() {
  const transactions = getAllUnifiedTransactions();
  const merchants = {};

  transactions.forEach((tx) => {
    const merchant = String(tx.merchant || tx.description || "").trim();
    if (!merchant) return;

    if (!merchants[merchant]) {
      merchants[merchant] = [];
    }

    merchants[merchant].push(tx);
  });

  return Object.entries(merchants)
    .filter(([_, txs]) => txs.length >= 2)
    .map(([merchant, txs]) => ({
      merchant,
      count: txs.length,
      averageAmount:
        txs.reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0) /
        txs.length,
    }))
    .sort((a, b) => b.count - a.count);
}

export function calculateCategoryBreakdown() {
  const transactions = getAllUnifiedTransactions();
  const categories = {};

  transactions.forEach((tx) => {
    const amount = Number(tx.amount || 0);
    if (amount >= 0) return;

    const category = tx.aiCategory || tx.category || "אחר";

    if (!categories[category]) {
      categories[category] = 0;
    }

    categories[category] += Math.abs(amount);
  });

  return Object.entries(categories)
    .map(([category, total]) => ({
      category,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}