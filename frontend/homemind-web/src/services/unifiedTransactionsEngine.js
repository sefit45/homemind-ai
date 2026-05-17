import { loadStoredTransactions } from "./transactionStore";
import { loadBankTransactions } from "./bankTransactionsStore";
import { categorizeTransactions } from "./transactionCategorizer";
import { enrichTransactionWithConfidence } from "./aiConfidenceEngine";

function buildUnifiedTransactionKey(tx) {
  return [
    tx.source || tx.issuer || "",
    tx.importFileName || "",
    tx.sourceSheet || "",
    tx.sourceRow || "",
    tx.date || "",
    tx.description || tx.merchant || "",
    tx.amount || "",
    tx.balance || "",
    tx.reference || "",
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function dedupeTransactions(transactions) {
  const seen = new Set();

  return transactions.filter((tx) => {
    const key = buildUnifiedTransactionKey(tx);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function normalizeTransaction(tx) {
  const amount = Number(tx.amount || 0);

  return {
    ...tx,
    amount,
    merchant: tx.merchant || tx.description || "לא ידוע",
    description: tx.description || tx.merchant || "לא ידוע",
    type: amount >= 0 ? "income" : "expense",
  };
}

export function getAllUnifiedTransactions() {
  const creditTransactions = loadStoredTransactions() || [];
  const bankTransactions = loadBankTransactions() || [];

  const creditOnlyTransactions = creditTransactions.filter(
    (tx) => tx.source !== "bank_statement"
  );

  const all = [...creditOnlyTransactions, ...bankTransactions]
    .map(normalizeTransaction)
    .filter((tx) => tx && Number(tx.amount || 0) !== 0);

  return categorizeTransactions(dedupeTransactions(all))
    .map(enrichTransactionWithConfidence)
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

    if (!merchants[merchant]) merchants[merchant] = [];

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

    categories[category] = (categories[category] || 0) + Math.abs(amount);
  });

  return Object.entries(categories)
    .map(([category, total]) => ({
      category,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getTransactionsNeedingReview() {
  return getAllUnifiedTransactions()
    .filter((tx) => tx.needsReview)
    .sort((a, b) => Number(a.aiConfidence || 0) - Number(b.aiConfidence || 0));
}

export function getConfidenceSummary() {
  const transactions = getAllUnifiedTransactions();

  const high = transactions.filter((tx) => tx.aiConfidence >= 90).length;
  const medium = transactions.filter(
    (tx) => tx.aiConfidence >= 70 && tx.aiConfidence < 90
  ).length;
  const low = transactions.filter((tx) => tx.aiConfidence < 70).length;

  const average =
    transactions.length > 0
      ? Math.round(
          transactions.reduce(
            (sum, tx) => sum + Number(tx.aiConfidence || 0),
            0
          ) / transactions.length
        )
      : 0;

  return {
    total: transactions.length,
    high,
    medium,
    low,
    average,
    needsReview: medium + low,
  };
}