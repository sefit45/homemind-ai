import { loadFinancialHistory } from "./financialHistoryVault";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function getTopEntry(map) {
  return Object.entries(map || {}).sort((a, b) => b[1] - a[1])[0] || null;
}

export function generateDailyBriefing() {
  const history = loadFinancialHistory();

  if (!history.length) {
    return "בוקר טוב ספי. עדיין אין לי מספיק נתונים פיננסיים. העלה קובצי עסקאות חודשיים, ואני אתחיל להכין לך תדרוך יומי חכם.";
  }

  const latestMonth = history[history.length - 1];
  const previousMonth = history[history.length - 2];

  const transactions = latestMonth.transactions || [];
  const expenses = transactions.filter((tx) => tx.type === "expense");
  const totalExpenses = expenses.reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0
  );

  const categoryTotals = {};
  const merchantTotals = {};

  expenses.forEach((tx) => {
    const amount = Math.abs(Number(tx.amount || 0));
    const category = tx.category || "לא מסווג";
    const merchant = tx.merchant || "לא ידוע";

    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    merchantTotals[merchant] = (merchantTotals[merchant] || 0) + amount;
  });

  const topCategory = getTopEntry(categoryTotals);
  const topMerchant = getTopEntry(merchantTotals);

  let changeSentence = "";

  if (previousMonth) {
    const previousExpenses = (previousMonth.transactions || [])
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

    if (previousExpenses > 0) {
      const diff = totalExpenses - previousExpenses;
      const direction = diff > 0 ? "עלייה" : "ירידה";

      changeSentence = ` לעומת החודש הקודם קיימת ${direction} של ${formatCurrency(
        diff
      )}.`;
    }
  }

  const savingPotential = Math.round(totalExpenses * 0.08);

  return `בוקר טוב ספי. בדקתי את הנתונים שלך עבור ${latestMonth.label}. יש לך ${expenses.length} עסקאות הוצאה, בסך כולל של ${formatCurrency(
    totalExpenses
  )}. הקטגוריה הבולטת היא ${
    topCategory ? topCategory[0] : "אין נתונים"
  } עם ${formatCurrency(topCategory ? topCategory[1] : 0)}. בית העסק הבולט הוא ${
    topMerchant ? topMerchant[0] : "אין נתונים"
  } עם ${formatCurrency(topMerchant ? topMerchant[1] : 0)}.${changeSentence} להערכתי אפשר להתחיל מחיסכון זהיר של כ־${formatCurrency(
    savingPotential
  )} החודש, בלי לפגוע משמעותית באורח החיים.`;
}
