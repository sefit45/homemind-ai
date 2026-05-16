const STORAGE_KEY = "homemind_bank_transactions_v1";

const defaultBankTransactions = [];

export function loadBankTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBankTransactions));
    return defaultBankTransactions;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultBankTransactions;
  } catch {
    return defaultBankTransactions;
  }
}

export function saveBankTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  return transactions;
}

export function addBankTransactions(newTransactions) {
  const existing = loadBankTransactions();

  const normalized = newTransactions.map((transaction, index) => ({
    id:
      transaction.id ||
      `bank_tx_${Date.now()}_${index}_${Math.random()
        .toString(36)
        .slice(2)}`,
    date: transaction.date || "",
    description: transaction.description || "",
    merchant: transaction.merchant || transaction.description || "",
    category: transaction.category || "לא מסווג",
    amount: Number(transaction.amount || 0),
    balance: Number(transaction.balance || 0),
    type: Number(transaction.amount || 0) >= 0 ? "income" : "expense",
    source: transaction.source || "bank_statement",
    accountName: transaction.accountName || "עו״ש",
    importedAt: new Date().toISOString(),
  }));

  const updated = [...existing, ...normalized];

  saveBankTransactions(updated);

  return updated;
}

export function clearBankTransactions() {
  localStorage.removeItem(STORAGE_KEY);
}

export function calculateBankTransactionsSummary() {
  const transactions = loadBankTransactions();

  const income = transactions
    .filter((tx) => Number(tx.amount) > 0)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const expenses = transactions
    .filter((tx) => Number(tx.amount) < 0)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const balance =
    transactions.length > 0
      ? Number(transactions[transactions.length - 1].balance || 0)
      : 0;

  return {
    transactions,
    count: transactions.length,
    income,
    expenses,
    netCashflow: income - expenses,
    latestBalance: balance,
  };
}