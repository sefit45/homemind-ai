import { loadFinancialHistory } from "./financialHistoryVault";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function buildInsight({ title, description, tone = "neutral", icon = "🧠" }) {
  return {
    id: `${title}-${Math.random().toString(16).slice(2)}`,
    title,
    description,
    tone,
    icon,
  };
}

function getMonthStats(month) {
  const transactions = month.transactions || [];
  const expenses = transactions.filter((tx) => tx.type === "expense");

  const totalExpenses = expenses.reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0
  );

  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const categoryTotals = expenses.reduce((acc, tx) => {
    const category = tx.category || "לא מסווג";
    acc[category] = (acc[category] || 0) + Math.abs(Number(tx.amount || 0));
    return acc;
  }, {});

  const merchantTotals = expenses.reduce((acc, tx) => {
    const merchant = tx.merchant || "לא ידוע";
    acc[merchant] = (acc[merchant] || 0) + Math.abs(Number(tx.amount || 0));
    return acc;
  }, {});

  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || null;

  const topMerchant =
    Object.entries(merchantTotals).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    id: month.id,
    label: month.label,
    transactionsCount: transactions.length,
    expensesCount: expenses.length,
    totalExpenses,
    totalIncome,
    net: totalIncome - totalExpenses,
    categoryTotals,
    merchantTotals,
    topCategoryName: topCategory ? topCategory[0] : "אין נתונים",
    topCategoryAmount: topCategory ? topCategory[1] : 0,
    topMerchantName: topMerchant ? topMerchant[0] : "אין נתונים",
    topMerchantAmount: topMerchant ? topMerchant[1] : 0,
  };
}

function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function generateDynamicInsights() {
  const history = loadFinancialHistory();

  if (!history.length) {
    return [
      buildInsight({
        title: "אין עדיין מספיק מידע",
        description: "ייבא קבצי עסקאות חודשיים כדי לקבל תובנות פיננסיות חכמות.",
        tone: "neutral",
        icon: "📥",
      }),
    ];
  }

  const stats = history.map(getMonthStats);
  const latest = stats[stats.length - 1];
  const previous = stats[stats.length - 2];

  const totalExpenses = stats.reduce((sum, month) => sum + month.totalExpenses, 0);
  const averageExpenses = totalExpenses / Math.max(stats.length, 1);

  const mostExpensiveMonth = [...stats].sort(
    (a, b) => b.totalExpenses - a.totalExpenses
  )[0];

  const cheapestMonth = [...stats].sort(
    (a, b) => a.totalExpenses - b.totalExpenses
  )[0];

  const mostActiveMonth = [...stats].sort(
    (a, b) => b.transactionsCount - a.transactionsCount
  )[0];

  const insights = [];

  insights.push(
    buildInsight({
      title: `סיכום ${latest.label}`,
      description: `נותחו ${latest.transactionsCount} עסקאות. סך ההוצאות: ${formatCurrency(
        latest.totalExpenses
      )}, הכנסות: ${formatCurrency(latest.totalIncome)}, נטו: ${
        latest.net >= 0 ? "+" : "-"
      }${formatCurrency(latest.net)}.`,
      tone: latest.net >= 0 ? "positive" : "warning",
      icon: "📊",
    })
  );

  insights.push(
    buildInsight({
      title: "ממוצע הוצאה חודשי",
      description: `ממוצע ההוצאות שלך על פני ${stats.length} חודשים הוא ${formatCurrency(
        averageExpenses
      )}.`,
      tone: "neutral",
      icon: "📈",
    })
  );

  if (latest.topCategoryAmount > 0) {
    insights.push(
      buildInsight({
        title: "קטגוריה מובילה בחודש האחרון",
        description: `${latest.topCategoryName} היא הקטגוריה המרכזית ב־${
          latest.label
        } עם ${formatCurrency(latest.topCategoryAmount)}.`,
        tone: "warning",
        icon: "🔥",
      })
    );
  }

  if (latest.topMerchantAmount > 0) {
    insights.push(
      buildInsight({
        title: "בית עסק מוביל",
        description: `${latest.topMerchantName} הוא בית העסק המשמעותי ביותר ב־${
          latest.label
        } עם ${formatCurrency(latest.topMerchantAmount)}.`,
        tone: "neutral",
        icon: "🏪",
      })
    );
  }

  if (previous) {
    const change = percentChange(latest.totalExpenses, previous.totalExpenses);

    if (change !== null) {
      insights.push(
        buildInsight({
          title: change > 0 ? "מגמת עלייה בהוצאות" : "מגמת ירידה בהוצאות",
          description: `ההוצאות ב־${latest.label} ${
            change > 0 ? "עלו" : "ירדו"
          } ב־${Math.abs(change).toFixed(1)}% לעומת ${previous.label}.`,
          tone: change > 0 ? "danger" : "positive",
          icon: change > 0 ? "⚠️" : "✅",
        })
      );
    }
  }

  if (mostExpensiveMonth) {
    insights.push(
      buildInsight({
        title: "החודש היקר ביותר",
        description: `${mostExpensiveMonth.label} הוא החודש עם ההוצאות הגבוהות ביותר: ${formatCurrency(
          mostExpensiveMonth.totalExpenses
        )}.`,
        tone: "danger",
        icon: "💸",
      })
    );
  }

  if (cheapestMonth) {
    insights.push(
      buildInsight({
        title: "החודש החסכוני ביותר",
        description: `${cheapestMonth.label} הוא החודש עם ההוצאות הנמוכות ביותר: ${formatCurrency(
          cheapestMonth.totalExpenses
        )}.`,
        tone: "positive",
        icon: "🌱",
      })
    );
  }

  if (mostActiveMonth) {
    insights.push(
      buildInsight({
        title: "החודש הפעיל ביותר",
        description: `${mostActiveMonth.label} כולל הכי הרבה עסקאות: ${mostActiveMonth.transactionsCount}.`,
        tone: "neutral",
        icon: "🧾",
      })
    );
  }

  return insights.slice(0, 8);
}