import { loadStoredTransactions } from "../services/transactionStore";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function getExpenseTransactions(transactions) {
  return transactions.filter((tx) => tx.type === "expense");
}

function getIncomeTransactions(transactions) {
  return transactions.filter((tx) => tx.type === "income");
}

function getCategoryTotals(transactions) {
  return getExpenseTransactions(transactions).reduce((acc, tx) => {
    const category = tx.category || "כללי";
    acc[category] = (acc[category] || 0) + Math.abs(tx.amount);
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
  ];

  return getExpenseTransactions(transactions)
    .filter((tx) =>
      recurringKeywords.some((keyword) =>
        String(tx.merchant).toUpperCase().includes(keyword)
      )
    )
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
}

export default function MonthlyAnalytics() {
  const transactions = loadStoredTransactions();

  const income = getIncomeTransactions(transactions).reduce(
    (sum, tx) => sum + Math.abs(tx.amount),
    0
  );

  const expenses = getExpenseTransactions(transactions).reduce(
    (sum, tx) => sum + Math.abs(tx.amount),
    0
  );

  const netCashflow = income - expenses;
  const recurringExpenses = estimateRecurringExpenses(transactions);
  const topCategory = getTopExpenseCategory(transactions);

  const analytics = [
    {
      title: "עסקאות שנשמרו",
      value: transactions.length.toLocaleString("he-IL"),
      subtitle: "מהקבצים שיובאו למערכת",
      icon: "🧾",
      tone: "neutral",
    },
    {
      title: "הכנסות",
      value: formatCurrency(income),
      subtitle: "מתוך העסקאות האמיתיות",
      icon: "💼",
      tone: "positive",
    },
    {
      title: "הוצאות",
      value: formatCurrency(expenses),
      subtitle: "סך חיובים שנקלטו",
      icon: "💳",
      tone: "negative",
    },
    {
      title: "תזרים נטו",
      value: `${netCashflow >= 0 ? "+" : "-"}${formatCurrency(netCashflow)}`,
      subtitle: netCashflow >= 0 ? "תזרים חיובי" : "תזרים שלילי",
      icon: "🌊",
      tone: netCashflow >= 0 ? "positive" : "negative",
    },
    {
      title: "קטגוריה מובילה",
      value: topCategory.category,
      subtitle: formatCurrency(topCategory.amount),
      icon: "🔥",
      tone: "warning",
    },
    {
      title: "מנויים מזוהים",
      value: formatCurrency(recurringExpenses),
      subtitle: "זיהוי ראשוני לפי בית עסק",
      icon: "🔁",
      tone: "neutral",
    },
  ];

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="text-2xl font-black">ניתוח חודשי אמיתי</div>
          <div className="text-slate-400 mt-1">
            מבוסס על העסקאות שיובאו מ־MAX ונשמרו במערכת
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/20 px-4 py-3 text-emerald-300 font-bold">
          Real Data
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

            <div className="text-slate-400 text-sm mb-2">
              {item.title}
            </div>

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