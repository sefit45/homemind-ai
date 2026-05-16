import { loadFinancialHistory } from "./financialHistoryVault";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function getMonthStats(month) {
  const transactions = month.transactions || [];
  const expenses = transactions.filter((tx) => tx.type === "expense");

  const totalExpenses = expenses.reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0
  );

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

  return {
    id: month.id,
    label: month.label,
    transactions,
    expenses,
    totalExpenses,
    categoryTotals,
    merchantTotals,
    transactionCount: transactions.length,
  };
}

function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function buildInsight({ title, description, severity = "info", icon = "🧠" }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    description,
    severity,
    icon,
  };
}

export function analyzeSpendingAnomalies() {
  const history = loadFinancialHistory();
  const stats = history.map(getMonthStats);

  if (stats.length === 0) {
    return [
      buildInsight({
        title: "אין עדיין נתונים",
        description: "ייבא קבצי עסקאות חודשיים כדי לזהות חריגות פיננסיות.",
        severity: "info",
        icon: "📥",
      }),
    ];
  }

  const insights = [];
  const latest = stats[stats.length - 1];
  const previous = stats[stats.length - 2];

  const mostExpensiveMonth = [...stats].sort(
    (a, b) => b.totalExpenses - a.totalExpenses
  )[0];

  if (mostExpensiveMonth) {
    insights.push(
      buildInsight({
        title: "החודש היקר ביותר",
        description: `${mostExpensiveMonth.label} הוא החודש היקר ביותר עם ${formatCurrency(
          mostExpensiveMonth.totalExpenses
        )} הוצאות.`,
        severity: "danger",
        icon: "💸",
      })
    );
  }

  if (latest && previous) {
    const change = percentChange(latest.totalExpenses, previous.totalExpenses);

    if (change !== null && Math.abs(change) >= 25) {
      insights.push(
        buildInsight({
          title:
            change > 0
              ? "עלייה חריגה בהוצאות"
              : "ירידה משמעותית בהוצאות",
          description: `ההוצאות ב־${latest.label} ${
            change > 0 ? "עלו" : "ירדו"
          } ב־${Math.abs(change).toFixed(1)}% לעומת ${previous.label}.`,
          severity: change > 0 ? "danger" : "positive",
          icon: change > 0 ? "⚠️" : "✅",
        })
      );
    }
  }

  stats.forEach((month, index) => {
    if (index === 0) return;

    const previousMonth = stats[index - 1];

    Object.entries(month.categoryTotals).forEach(([category, amount]) => {
      const previousAmount = previousMonth.categoryTotals[category] || 0;
      const change = percentChange(amount, previousAmount);

      if (change !== null && change >= 40 && amount >= 500) {
        insights.push(
          buildInsight({
            title: `קפיצה בקטגוריית ${category}`,
            description: `ב־${month.label} הוצאות ${category} עלו ב־${change.toFixed(
              1
            )}% לעומת ${previousMonth.label}.`,
            severity: "warning",
            icon: "📈",
          })
        );
      }
    });
  });

  const allExpenses = stats.flatMap((month) =>
    month.expenses.map((tx) => ({
      ...tx,
      monthLabel: month.label,
      amountAbs: Math.abs(Number(tx.amount || 0)),
    }))
  );

  const averageTransaction =
    allExpenses.reduce((sum, tx) => sum + tx.amountAbs, 0) /
    Math.max(allExpenses.length, 1);

  allExpenses
    .filter((tx) => tx.amountAbs >= averageTransaction * 4 && tx.amountAbs >= 500)
    .sort((a, b) => b.amountAbs - a.amountAbs)
    .slice(0, 3)
    .forEach((tx) => {
      insights.push(
        buildInsight({
          title: "עסקה חריגה זוהתה",
          description: `${tx.merchant} ב־${tx.monthLabel}: ${formatCurrency(
            tx.amountAbs
          )}, גבוה משמעותית מהממוצע לעסקה.`,
          severity: "danger",
          icon: "🚨",
        })
      );
    });

  stats.forEach((month) => {
    Object.entries(month.merchantTotals).forEach(([merchant, amount]) => {
      const share =
        month.totalExpenses > 0 ? (amount / month.totalExpenses) * 100 : 0;

      if (share >= 35 && amount >= 1000) {
        insights.push(
          buildInsight({
            title: "בית עסק דומיננטי במיוחד",
            description: `${merchant} מהווה ${share.toFixed(
              1
            )}% מהוצאות ${month.label}.`,
            severity: "warning",
            icon: "🏪",
          })
        );
      }
    });
  });

  const mostActiveMonth = [...stats].sort(
    (a, b) => b.transactionCount - a.transactionCount
  )[0];

  const averageTransactions =
    stats.reduce((sum, month) => sum + month.transactionCount, 0) /
    Math.max(stats.length, 1);

  if (
    mostActiveMonth &&
    mostActiveMonth.transactionCount >= averageTransactions * 1.5
  ) {
    insights.push(
      buildInsight({
        title: "חודש עם פעילות גבוהה",
        description: `${mostActiveMonth.label} כולל ${
          mostActiveMonth.transactionCount
        } עסקאות, גבוה מהממוצע החודשי שעומד על ${averageTransactions.toFixed(
          0
        )}.`,
        severity: "info",
        icon: "🧾",
      })
    );
  }

  return insights.slice(0, 8);
}