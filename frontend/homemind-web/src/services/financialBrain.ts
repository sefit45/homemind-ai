import { Transaction } from "../types/transactions";
import { loadStoredTransactions } from "./transactionStore";

export interface FinancialBrainSummary {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  topCategory: {
    name: string;
    amount: number;
  };
  categoryTotals: Record<string, number>;
  recurringEstimate: number;
  insights: string[];
}

function sumByType(transactions: Transaction[], type: "income" | "expense") {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
}

function getCategoryTotals(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce<Record<string, number>>((acc, transaction) => {
      const category = transaction.category || "כללי";
      acc[category] = (acc[category] || 0) + Math.abs(transaction.amount);
      return acc;
    }, {});
}

function getTopCategory(categoryTotals: Record<string, number>) {
  const entries = Object.entries(categoryTotals);

  if (!entries.length) {
    return {
      name: "אין נתונים",
      amount: 0,
    };
  }

  const [name, amount] = entries.sort((a, b) => b[1] - a[1])[0];

  return {
    name,
    amount,
  };
}

function estimateRecurring(transactions: Transaction[]) {
  const recurringKeywords = [
    "OPENAI",
    "CHATGPT",
    "CLAUDE",
    "SPOTIFY",
    "NETFLIX",
    "APPLE",
    "GOOGLE",
    "MICROSOFT",
  ];

  return transactions
    .filter((transaction) => {
      const merchant = transaction.merchant.toUpperCase();

      return recurringKeywords.some((keyword) => merchant.includes(keyword));
    })
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
}

function formatCurrency(value: number) {
  return `₪${Math.round(value).toLocaleString("he-IL")}`;
}

export function getFinancialBrainSummary(): FinancialBrainSummary {
  const transactions = loadStoredTransactions();

  const totalIncome = sumByType(transactions, "income");
  const totalExpenses = sumByType(transactions, "expense");
  const netCashflow = totalIncome - totalExpenses;
  const categoryTotals = getCategoryTotals(transactions);
  const topCategory = getTopCategory(categoryTotals);
  const recurringEstimate = estimateRecurring(transactions);

  const insights = [
    `נותחו ${transactions.length} עסקאות אמיתיות מתוך המאגר המקומי.`,
    `סך ההוצאות שנקלטו עומד על ${formatCurrency(totalExpenses)}.`,
    `הקטגוריה היקרה ביותר היא ${topCategory.name} עם ${formatCurrency(
      topCategory.amount
    )}.`,
    `זוהו חיובים חוזרים פוטנציאליים בסך ${formatCurrency(
      recurringEstimate
    )}.`,
    netCashflow >= 0
      ? `התזרים הכולל חיובי ועומד על ${formatCurrency(netCashflow)}.`
      : `התזרים הכולל שלילי ועומד על ${formatCurrency(netCashflow)}.`,
  ];

  return {
    totalTransactions: transactions.length,
    totalIncome,
    totalExpenses,
    netCashflow,
    topCategory,
    categoryTotals,
    recurringEstimate,
    insights,
  };
}