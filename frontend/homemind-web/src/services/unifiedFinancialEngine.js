import { loadStoredTransactions } from "./transactionStore";

function isCreditCardSettlement(tx) {
  const text = `${tx.merchant || ""} ${tx.description || ""}`.toLowerCase();

  return (
    text.includes("max") ||
    text.includes("מקס") ||
    text.includes("ישראכרט") ||
    text.includes("כאל") ||
    text.includes("cal") ||
    text.includes("לאומי קארד")
  );
}

function normalizeAmount(value) {
  return Number(value || 0);
}

function normalizeTransaction(tx) {
  const amount = normalizeAmount(tx.amount);

  const isBank = tx.source === "bank_statement";
  const isCredit = tx.source === "credit_card";

  const settlement = isBank && amount < 0 && isCreditCardSettlement(tx);

  return {
    ...tx,
    normalizedAmount: amount,
    isBankTransaction: isBank,
    isCreditCardTransaction: isCredit,
    isCreditCardSettlement: settlement,
    excludeFromTrueExpenses: settlement,
  };
}

export function loadUnifiedTransactions() {
  return loadStoredTransactions()
    .map(normalizeTransaction)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function calculateUnifiedFinancialSummary() {
  const transactions = loadUnifiedTransactions();

  const trueIncome = transactions
    .filter((tx) => tx.normalizedAmount > 0)
    .reduce((sum, tx) => sum + tx.normalizedAmount, 0);

  const trueExpenses = transactions
    .filter(
      (tx) =>
        tx.normalizedAmount < 0 &&
        !tx.excludeFromTrueExpenses
    )
    .reduce((sum, tx) => sum + Math.abs(tx.normalizedAmount), 0);

  const bankExpenses = transactions
    .filter(
      (tx) =>
        tx.isBankTransaction &&
        tx.normalizedAmount < 0 &&
        !tx.excludeFromTrueExpenses
    )
    .reduce((sum, tx) => sum + Math.abs(tx.normalizedAmount), 0);

  const creditCardExpenses = transactions
    .filter((tx) => tx.isCreditCardTransaction)
    .reduce((sum, tx) => sum + Math.abs(tx.normalizedAmount), 0);

  const creditCardSettlements = transactions
    .filter((tx) => tx.isCreditCardSettlement)
    .reduce((sum, tx) => sum + Math.abs(tx.normalizedAmount), 0);

  return {
    transactions,
    transactionsCount: transactions.length,
    trueIncome,
    trueExpenses,
    trueNetCashflow: trueIncome - trueExpenses,
    bankExpenses,
    creditCardExpenses,
    creditCardSettlements,
  };
}

export function generateUnifiedInsights() {
  const summary = calculateUnifiedFinancialSummary();

  const insights = [];

  insights.push(
    `נותחו ${summary.transactionsCount.toLocaleString(
      "he-IL"
    )} תנועות מכל המקורות: עו״ש וכרטיסי אשראי.`
  );

  insights.push(
    `הכנסות אמיתיות: ₪${Math.round(summary.trueIncome).toLocaleString(
      "he-IL"
    )}, הוצאות אמיתיות ללא כפילות אשראי: ₪${Math.round(
      summary.trueExpenses
    ).toLocaleString("he-IL")}.`
  );

  insights.push(
    `התזרים המאוחד שלך עומד על ₪${Math.round(
      summary.trueNetCashflow
    ).toLocaleString("he-IL")}.`
  );

  if (summary.creditCardSettlements > 0) {
    insights.push(
      `זוהו חיובי אשראי מהעו״ש בסך ₪${Math.round(
        summary.creditCardSettlements
      ).toLocaleString(
        "he-IL"
      )}. הם סומנו כהחזרי אשראי כדי למנוע ספירה כפולה.`
    );
  }

  return insights;
}