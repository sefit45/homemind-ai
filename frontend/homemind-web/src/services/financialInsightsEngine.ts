import { loadFinancialHistory } from "./financialHistoryVault";

export interface FinancialInsight {
  id: string;
  title: string;
  description: string;
  tone: "positive" | "warning" | "danger" | "neutral";
  icon: string;
}

function formatCurrency(value: number) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function getStats(month: any) {
  const transactions = month.transactions || [];

  const expenses = transactions
    .filter((tx: any) => tx.type === "expense")
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const income = transactions
    .filter((tx: any) => tx.type === "income")
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const categoryTotals = transactions
    .filter((tx: any) => tx.type === "expense")
    .reduce<Record<string, number>>((acc, tx: any) => {
      const category = tx.category || "לא מסווג";
      acc[category] = (acc[category] || 0) + Math.abs(Number(tx.amount || 0));
      return acc;
    }, {});

  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    label: month.label,
    transactionsCount: transactions.length,
    expenses,
    income,
    net: income - expenses,
    categoryTotals,
    topCategoryName: topCategory ? topCategory[0] : "אין נתונים",
    topCategoryAmount: topCategory ? topCategory[1] : 0,
    averageExpense:
      transactions.length > 0 ? expenses / Math.max(transactions.length, 1) : 0,
  };
}

function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function generateFinancialInsights(): FinancialInsight[] {
  const history = loadFinancialHistory();

  if (!history.length) {
    return [
      {
        id: "no-data",
        title: "אין עדיין מספיק נתונים",
        description: "ייבא קבצי עסקאות חודשיים כדי לקבל תובנות AI אמיתיות.",
        tone: "neutral",
        icon: "🧠",
      },
    ];
  }

  const stats = history.map(getStats);
  const latest = stats[stats.length - 1];
  const previous = stats[stats.length - 2];

  const insights: FinancialInsight[] = [];

  if (latest) {
    insights.push({
      id: "latest-summary",
      title: `סיכום ${latest.label}`,
      description: `בחודש זה נותחו ${latest.transactionsCount} עסקאות, עם הוצאות בסך ${formatCurrency(
        latest.expenses
      )}.`,
      tone: "neutral",
      icon: "📊",
    });

    insights.push({
      id: "top-category",
      title: "קטגוריה מובילה",
      description: `${latest.topCategoryName} היא הקטגוריה המובילה עם ${formatCurrency(
        latest.topCategoryAmount
      )}.`,
      tone: "warning",
      icon: "🔥",
    });
  }

  if (latest && previous) {
    const change = percentChange(latest.expenses, previous.expenses);

    if (change !== null) {
      insights.push({
        id: "expense-change",
        title:
          change > 0
            ? "עלייה בהוצאות החודש"
            : "ירידה בהוצאות החודש",
        description: `ההוצאות ב־${latest.label} ${
          change > 0 ? "עלו" : "ירדו"
        } ב־${Math.abs(change).toFixed(1)}% לעומת ${previous.label}.`,
        tone: change > 0 ? "danger" : "positive",
        icon: change > 0 ? "⚠️" : "✅",
      });
    }
  }

  const mostExpensiveMonth = [...stats].sort((a, b) => b.expenses - a.expenses)[0];

  if (mostExpensiveMonth) {
    insights.push({
      id: "most-expensive-month",
      title: "החודש היקר ביותר",
      description: `${mostExpensiveMonth.label} הוא החודש היקר ביותר עם ${formatCurrency(
        mostExpensiveMonth.expenses
      )} הוצאות.`,
      tone: "danger",
      icon: "💸",
    });
  }

  const mostActiveMonth = [...stats].sort(
    (a, b) => b.transactionsCount - a.transactionsCount
  )[0];

  if (mostActiveMonth) {
    insights.push({
      id: "most-active-month",
      title: "החודש עם הכי הרבה עסקאות",
      description: `${mostActiveMonth.label} כולל ${mostActiveMonth.transactionsCount} עסקאות.`,
      tone: "neutral",
      icon: "🧾",
    });
  }

  return insights.slice(0, 6);
}