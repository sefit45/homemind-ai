import { loadStoredTransactions } from "./transactionStore";
import { loadBankTransactions } from "./bankTransactionsStore";
import { categorizeTransactions } from "./transactionCategorizer";
import { enrichTransactionWithConfidence } from "./aiConfidenceEngine";

const VALID_TRANSACTION_TYPES = ["income", "expense", "transfer"];

function buildUnifiedTransactionKey(tx) {
  const merchant = tx.description || tx.merchant || "";
  const amount = Number(tx.amount || 0);

  return [
    tx.source || tx.issuer || "",
    tx.date || "",
    merchant,
    Number.isFinite(amount) ? amount.toFixed(2) : tx.amount || "",
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

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function isCreditCardTransaction(tx) {
  const source = normalizeText(tx.source);
  const issuer = normalizeText(tx.issuer);

  if (source === "bank_statement") return false;

  return (
    source.includes("credit") ||
    source.includes("card") ||
    source.includes("max") ||
    source.includes("cal") ||
    source.includes("isracard") ||
    issuer.includes("max") ||
    issuer.includes("כאל") ||
    issuer.includes("ישראכרט") ||
    issuer.includes("ויזה") ||
    issuer.includes("visa") ||
    !source
  );
}

function isBankTransaction(tx) {
  return normalizeText(tx.source) === "bank_statement";
}

function looksLikeRefundOrCredit(tx) {
  const text = normalizeText(
    `${tx.merchant || ""} ${tx.description || ""} ${tx.details || ""}`
  );

  return (
    text.includes("זיכוי") ||
    text.includes("החזר") ||
    text.includes("refund") ||
    text.includes("cashback") ||
    text.includes("chargeback")
  );
}

function looksLikeTransfer(tx) {
  const text = normalizeText(
    `${tx.merchant || ""} ${tx.description || ""} ${tx.details || ""}`
  );

  return (
    text.includes("העברה") ||
    text.includes("העברת") ||
    text.includes("bit") ||
    text.includes("ביט") ||
    text.includes("פייבוקס") ||
    text.includes("paybox")
  );
}

function resolveTransactionType(tx) {
  const amount = Number(tx.amount || 0);
  const existingType = tx.type;

  if (tx.userCorrectedType && VALID_TRANSACTION_TYPES.includes(existingType)) {
    return existingType;
  }

  if (looksLikeTransfer(tx)) {
    return "transfer";
  }

  if (isCreditCardTransaction(tx)) {
    if (looksLikeRefundOrCredit(tx)) {
      return "income";
    }

    return "expense";
  }

  if (isBankTransaction(tx)) {
    if (amount > 0) return "income";
    if (amount < 0) return "expense";

    if (VALID_TRANSACTION_TYPES.includes(existingType)) {
      return existingType;
    }

    return "expense";
  }

  if (VALID_TRANSACTION_TYPES.includes(existingType)) {
    return existingType;
  }

  return amount > 0 ? "income" : "expense";
}

function normalizeTransaction(tx) {
  const amount = Number(tx.amount || 0);
  const type = resolveTransactionType(tx);

  return {
    ...tx,
    amount,
    type,
    merchant: tx.merchant || tx.description || "לא ידוע",
    description: tx.description || tx.merchant || "לא ידוע",
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
    const amount = Math.abs(Number(tx.amount || 0));

    if (tx.excludeFromTrueExpenses) return;

    if (tx.type === "income") {
      income += amount;
    }

    if (tx.type === "expense") {
      expenses += amount;
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
    if (tx.type !== "expense") return;
    if (tx.excludeFromTrueExpenses) return;

    const merchant = String(tx.merchant || tx.description || "").trim();
    if (!merchant) return;

    if (!merchants[merchant]) merchants[merchant] = [];

    merchants[merchant].push(tx);
  });

  return Object.entries(merchants)
    .filter((entry) => entry[1].length >= 2)
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
    if (tx.type !== "expense") return;
    if (tx.excludeFromTrueExpenses) return;

    const amount = Math.abs(Number(tx.amount || 0));
    const category = tx.aiCategory || tx.category || "אחר";

    categories[category] = (categories[category] || 0) + amount;
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
