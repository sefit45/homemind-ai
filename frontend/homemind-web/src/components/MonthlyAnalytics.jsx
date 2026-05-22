import { useState } from "react";
import { loadFinancialHistory } from "../services/financialHistoryVault";
import { resolveTransactionCategory } from "../services/transactionStore";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(Number(value || 0))).toLocaleString("he-IL")}`;
}

function getExpenseTransactions(transactions) {
  return transactions.filter((tx) => tx.type === "expense");
}

function getIncomeTransactions(transactions) {
  return transactions.filter((tx) => tx.type === "income");
}

function getCategoryTotals(transactions) {
  return getExpenseTransactions(transactions).reduce((acc, tx) => {
    const category = resolveTransactionCategory(tx);
    acc[category] = (acc[category] || 0) + Math.abs(Number(tx.amount || 0));
    return acc;
  }, {});
}

function getTopExpenseCategory(transactions) {
  const totals = getCategoryTotals(transactions);
  const entries = Object.entries(totals);

  if (!entries.length) {
    return { category: "אין נתונים", amount: 0 };
  }

  const [category, amount] = entries.sort((a, b) => b[1] - a[1])[0];

  return { category, amount };
}

function estimateRecurringExpenses(transactions) {
  const recurringKeywords = [
    "OPENAI",
    "CHATGPT",
    "CLAUDE",
    "SPOTIFY",
    "NETFLIX",
    "APPLE",
    "GOOGLE",
    "MICROSOFT",
    "STACKBLITZ",
    "BOLT",
    "SHOPIFY",
    "NAME-CHEAP",
  ];

  return getExpenseTransactions(transactions)
    .filter((tx) =>
      recurringKeywords.some((keyword) =>
        String(tx.merchant || "").toUpperCase().includes(keyword)
      )
    )
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
}

export default function MonthlyAnalytics() {
  const history = loadFinancialHistory();

  const [selectedMonthId, setSelectedMonthId] = useState(
    history[history.length - 1]?.id || ""
  );

  const selectedMonth =
    history.find((month) => month.id === selectedMonthId) ||
    history[history.length - 1];

  const transactions = selectedMonth?.transactions || [];

  const income = getIncomeTransactions(transactions).reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0
  );

  const expenses = getExpenseTransactions(transactions).reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0
  );

  const analyticsData = {
    income,
    expenses,
    netCashflow: income - expenses,
    recurringExpenses: estimateRecurringExpenses(transactions),
    topCategory: getTopExpenseCategory(transactions),
    transactionCount: transactions.length,
  };

  if (!history.length) {
    return (
      <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
        <div className="text-2xl font-black">ניתוח חודשי אמיתי</div>
        <div className="text-slate-400 mt-2">
          עדיין אין נתונים חודשיים. העלה קבצי אשראי או בנק לפי חודשים.
        </div>
      </section>
    );
  }

  const analytics = [
    {
      title: "עסקאות בחודש",
      value: analyticsData.transactionCount.toLocaleString("he-IL"),
      subtitle: selectedMonth?.label || "חודש נבחר",
      icon: "🧾",
      tone: "neutral",
    },
    {
      title: "הכנסות",
      value: formatCurrency(analyticsData.income),
      subtitle: "מתוך עסקאות החודש בלבד",
      icon: "💼",
      tone: "positive",
    },
    {
      title: "הוצאות",
      value: formatCurrency(analyticsData.expenses),
      subtitle: "סך חיובים בחודש הנבחר",
      icon: "💳",
      tone: "negative",
    },
    {
      title: "תזרים נטו",
      value: `${analyticsData.netCashflow >= 0 ? "+" : "-"}${formatCurrency(
        analyticsData.netCashflow
      )}`,
      subtitle:
        analyticsData.netCashflow >= 0 ? "תזרים חיובי" : "תזרים שלילי",
      icon: "🌊",
      tone: analyticsData.netCashflow >= 0 ? "positive" : "negative",
    },
    {
      title: "קטגוריה מובילה",
      value: analyticsData.topCategory.category,
      subtitle: formatCurrency(analyticsData.topCategory.amount),
      icon: "🔥",
      tone: "warning",
    },
    {
      title: "מנויים מזוהים",
      value: formatCurrency(analyticsData.recurringExpenses),
      subtitle: "זיהוי לפי בית עסק בחודש הנבחר",
      icon: "🔁",
      tone: "neutral",
    },
  ];

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7 gap-5">
        <div>
          <div className="text-2xl font-black">ניתוח חודשי אמיתי</div>
          <div className="text-slate-400 mt-1">
            מבוסס רק על העסקאות של החודש הנבחר
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth?.id || ""}
            onChange={(event) => setSelectedMonthId(event.target.value)}
            className="rounded-2xl bg-black/30 border border-white/10 px-5 py-3 text-white outline-none"
          >
            {history.map((month) => (
              <option key={month.id} value={month.id}>
                {month.label}
              </option>
            ))}
          </select>

          <div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/20 px-4 py-3 text-emerald-300 font-bold">
            Real Data
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        {analytics.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5 hover:bg-white/[0.07] hover:border-cyan-400/30 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-3xl">{item.icon}</div>

              <div
                className={`h-3 w-3 rounded-full ${
                  item.tone === "positive"
                    ? "bg-emerald-300"
                    : item.tone === "negative"
                    ? "bg-rose-300"
                    : item.tone === "warning"
                    ? "bg-amber-300"
                    : "bg-cyan-300"
                }`}
              />
            </div>

            <div className="text-slate-400 text-sm mb-2">{item.title}</div>

            <div className="text-2xl font-black leading-tight">
              {item.value}
            </div>

            <div className="text-slate-500 text-sm mt-3 leading-6">
              {item.subtitle}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
