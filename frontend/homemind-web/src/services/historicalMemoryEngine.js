import { loadFinancialHistory } from "./financialHistoryVault";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function buildMemory({ title, description, type = "info", icon = "🧠" }) {
  return {
    id: `${title}-${Math.random().toString(16).slice(2)}`,
    title,
    description,
    type,
    icon,
  };
}

function getStats(month) {
  const transactions = month.transactions || [];
  const expenses = transactions.filter((tx) => tx.type === "expense");

  const totalExpenses = expenses.reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0
  );

  const categoryTotals = {};
  const merchantTotals = {};

  expenses.forEach((tx) => {
    const category = tx.category || "לא מסווג";
    const merchant = tx.merchant || "לא ידוע";
    const amount = Math.abs(Number(tx.amount || 0));

    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    merchantTotals[merchant] = (merchantTotals[merchant] || 0) + amount;
  });

  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || null;

  const topMerchant =
    Object.entries(merchantTotals).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    id: month.id,
    label: month.label,
    transactionsCount: transactions.length,
    totalExpenses,
    categoryTotals,
    merchantTotals,
    topCategoryName: topCategory?.[0] || "אין נתונים",
    topCategoryAmount: topCategory?.[1] || 0,
    topMerchantName: topMerchant?.[0] || "אין נתונים",
    topMerchantAmount: topMerchant?.[1] || 0,
  };
}

function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function generateHistoricalMemories() {
  const history = loadFinancialHistory();

  if (!history.length) {
    return [
      buildMemory({
        title: "אין עדיין זיכרון פיננסי",
        description: "ייבא כמה חודשי עסקאות כדי ש־HomeMind יתחיל לזהות דפוסים לאורך זמן.",
        type: "info",
        icon: "📥",
      }),
    ];
  }

  const stats = history.map(getStats);
  const memories = [];

  const mostExpensive = [...stats].sort(
    (a, b) => b.totalExpenses - a.totalExpenses
  )[0];

  const cheapest = [...stats].sort(
    (a, b) => a.totalExpenses - b.totalExpenses
  )[0];

  const mostActive = [...stats].sort(
    (a, b) => b.transactionsCount - a.transactionsCount
  )[0];

  memories.push(
    buildMemory({
      title: "החודש היקר ביותר בזיכרון",
      description: `${mostExpensive.label} מוביל עם הוצאות בסך ${formatCurrency(
        mostExpensive.totalExpenses
      )}.`,
      type: "danger",
      icon: "💸",
    })
  );

  memories.push(
    buildMemory({
      title: "החודש החסכוני ביותר",
      description: `${cheapest.label} הוא החודש הנמוך ביותר בהוצאות עם ${formatCurrency(
        cheapest.totalExpenses
      )}.`,
      type: "positive",
      icon: "🌱",
    })
  );

  memories.push(
    buildMemory({
      title: "החודש הפעיל ביותר",
      description: `${mostActive.label} כולל הכי הרבה עסקאות: ${mostActive.transactionsCount}.`,
      type: "info",
      icon: "🧾",
    })
  );

  stats.forEach((month, index) => {
    if (index === 0) return;

    const previous = stats[index - 1];
    const change = percentChange(month.totalExpenses, previous.totalExpenses);

    if (change !== null && Math.abs(change) >= 30) {
      memories.push(
        buildMemory({
          title: change > 0 ? "שינוי היסטורי בעלייה" : "שינוי היסטורי בירידה",
          description: `ב־${month.label} ההוצאות ${
            change > 0 ? "עלו" : "ירדו"
          } ב־${Math.abs(change).toFixed(1)}% לעומת ${previous.label}.`,
          type: change > 0 ? "warning" : "positive",
          icon: change > 0 ? "📈" : "📉",
        })
      );
    }
  });

  const allCategories = new Set();
  stats.forEach((month) => {
    Object.keys(month.categoryTotals).forEach((category) =>
      allCategories.add(category)
    );
  });

  allCategories.forEach((category) => {
    const categoryByMonth = stats.map((month) => ({
      label: month.label,
      amount: month.categoryTotals[category] || 0,
    }));

    const peak = [...categoryByMonth].sort((a, b) => b.amount - a.amount)[0];

    if (peak?.amount >= 500) {
      memories.push(
        buildMemory({
          title: `שיא היסטורי בקטגוריית ${category}`,
          description: `${peak.label} היה החודש הגבוה ביותר בקטגוריה זו עם ${formatCurrency(
            peak.amount
          )}.`,
          type: "info",
          icon: "🏆",
        })
      );
    }
  });

  const merchantMonths = {};

  stats.forEach((month) => {
    Object.keys(month.merchantTotals).forEach((merchant) => {
      if (!merchantMonths[merchant]) {
        merchantMonths[merchant] = [];
      }

      merchantMonths[merchant].push(month.label);
    });
  });

  Object.entries(merchantMonths).forEach(([merchant, months]) => {
    if (months.length >= 3) {
      memories.push(
        buildMemory({
          title: "בית עסק שחוזר לאורך זמן",
          description: `${merchant} מופיע ב־${months.length} חודשים שונים, מה שמרמז על דפוס הוצאה חוזר.`,
          type: "warning",
          icon: "🔁",
        })
      );
    }
  });

  return memories.slice(0, 10);
}