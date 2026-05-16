import { Transaction } from "../types/transactions";

export interface MonthlyVault {
  id: string;
  year: number;
  month: number;
  label: string;
  source: string;
  importedAt: string;
  transactionCount: number;
  transactions: Transaction[];
}

const STORAGE_KEY = "homemind_financial_history_v1";

const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

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

export function getMonthLabel(year: number, month: number): string {
  return `${HEBREW_MONTHS[month - 1]} ${year}`;
}

export function loadFinancialHistory(): MonthlyVault[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMonthToVault(params: {
  year: number;
  month: number;
  source: string;
  transactions: Transaction[];
}): MonthlyVault[] {
  const history = loadFinancialHistory();

  const monthId = `${params.year}-${String(params.month).padStart(2, "0")}`;

  const existingMonth = history.find((item) => item.id === monthId);

  const existingTransactions = existingMonth?.transactions || [];
  const existingKeys = new Set(existingTransactions.map(buildTransactionKey));

  const newTransactions = params.transactions.filter((transaction) => {
    const key = buildTransactionKey(transaction);

    if (existingKeys.has(key)) return false;

    existingKeys.add(key);
    return true;
  });

  const mergedTransactions = [...existingTransactions, ...newTransactions];

  const updatedMonth: MonthlyVault = {
    id: monthId,
    year: params.year,
    month: params.month,
    label: getMonthLabel(params.year, params.month),
    source: params.source,
    importedAt: new Date().toISOString(),
    transactionCount: mergedTransactions.length,
    transactions: mergedTransactions,
  };

  const withoutMonth = history.filter((item) => item.id !== monthId);

  const updatedHistory = [...withoutMonth, updatedMonth].sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));

  return updatedHistory;
}

export function getVaultMonth(year: number, month: number): MonthlyVault | null {
  const monthId = `${year}-${String(month).padStart(2, "0")}`;

  return loadFinancialHistory().find((item) => item.id === monthId) || null;
}

export function getAllVaultTransactions(): Transaction[] {
  return loadFinancialHistory().flatMap((month) => month.transactions);
}

export function clearFinancialHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getVaultSummary() {
  const history = loadFinancialHistory();
  const allTransactions = getAllVaultTransactions();

  const totalExpenses = allTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalIncome = allTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return {
    monthsCount: history.length,
    transactionsCount: allTransactions.length,
    totalExpenses,
    totalIncome,
    net: totalIncome - totalExpenses,
    months: history,
  };
}