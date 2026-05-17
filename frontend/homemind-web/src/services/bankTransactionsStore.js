import { saveCategoryLearning } from "./transactionLearningStore";

const STORAGE_KEY = "homemind_bank_transactions_v1";

function buildBankTransactionKey(tx) {
  return [
    tx.date,
    tx.description,
    tx.amount,
    tx.balance,
    tx.reference,
    tx.sourceRow,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

export function getBankTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadBankTransactions() {
  return getBankTransactions();
}

export function addBankTransactions(transactions = []) {
  const existing = getBankTransactions();
  const keys = new Set(existing.map(buildBankTransactionKey));

  const newTransactions = transactions.filter((tx) => {
    const key = buildBankTransactionKey(tx);

    if (keys.has(key)) return false;

    keys.add(key);
    return true;
  });

  const merged = [...existing, ...newTransactions];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

  return merged;
}

export function updateBankTransactionCategory(transactionId, category) {
  const transactions = getBankTransactions();

  const updated = transactions.map((tx) => {
    if (String(tx.id) !== String(transactionId)) {
      return tx;
    }

    const merchant = tx.merchant || tx.description || "";

    saveCategoryLearning(merchant, category);

    return {
      ...tx,
      category,
      mappedCategory: category,
      userCorrectedCategory: true,
      categoryUpdatedAt: new Date().toISOString(),
    };
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  window.dispatchEvent(new Event("homemind:transactions-updated"));

  return updated;
}

export function saveBankTransactions(transactions = []) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  return transactions;
}

export function clearBankTransactions() {
  localStorage.removeItem(STORAGE_KEY);
}

export function calculateBankTransactionsSummary() {
  const transactions = getBankTransactions();

  const income = transactions
    .filter((tx) => Number(tx.amount || 0) > 0)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const expenses = transactions
    .filter((tx) => Number(tx.amount || 0) < 0)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  return {
    count: transactions.length,
    income,
    expenses,
    netCashflow: income - expenses,
  };
}