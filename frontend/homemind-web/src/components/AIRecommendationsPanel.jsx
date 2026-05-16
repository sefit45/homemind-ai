import { loadFinancialHistory } from "../services/financialHistoryVault";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function buildMonthModels() {
  return loadFinancialHistory().map((month) => {
    const expenses = (month.transactions || []).filter(
      (tx) => tx.type === "expense"
    );

    const totalExpenses = expenses.reduce(
      (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
      0
    );

    const categoriesMap = {};
    const merchantsMap = {};

    expenses.forEach((tx) => {
      const category = tx.category || "לא מסווג";
      const merchant = tx.merchant || "לא ידוע";
      const amount = Math.abs(Number(tx.amount || 0));

      categoriesMap[category] = (categoriesMap[category] || 0) + amount;

      if (!merchantsMap[merchant]) {
        merchantsMap[merchant] = {
          name: merchant,
          total: 0,
          transactions: 0,
        };
      }

      merchantsMap[merchant].total += amount;
      merchantsMap[merchant].transactions += 1;
    });

    return {
      id: month.id,
      label: month.label,
      monthNumber: month.month,
      totalExpenses,
      categories: Object.entries(categoriesMap).map(([category, total]) => ({
        category,
        total,
      })),
      merchants: Object.values(merchantsMap),
    };
  });
}

function generateRecommendations(months) {
  if (!months.length) {
    return [
      {
        type: "neutral",
        title: "אין עדיין מספיק נתונים",
        message: "ייבא כמה חודשי עסקאות כדי לקבל המלצות AI אמיתיות.",
        potentialSaving: 0,
      },
    ];
  }

  const sortedMonths = [...months].sort(
    (a, b) => Number(a.monthNumber) - Number(b.monthNumber)
  );

  const latestMonth = sortedMonths[sortedMonths.length - 1];
  const recommendations = [];
  const totalExpenses = latestMonth.totalExpenses || 0;

  const foodCategory = latestMonth.categories?.find(
    (item) =>
      item.category?.includes("מזון") ||
      item.category?.includes("אוכל") ||
      item.category?.includes("צריכה")
  );

  if (foodCategory && totalExpenses > 0) {
    const foodPercent = (foodCategory.total / totalExpenses) * 100;

    if (foodPercent > 35) {
      recommendations.push({
        type: "warning",
        title: "הוצאות מזון גבוהות",
        message: `קטגוריית המזון מהווה ${foodPercent.toFixed(
          1
        )}% מכלל ההוצאות ב־${latestMonth.label}.`,
        potentialSaving: Math.round(foodCategory.total * 0.15),
      });
    }
  }

  const recurringMerchants = latestMonth.merchants?.filter(
    (merchant) => merchant.transactions >= 3
  );

  recurringMerchants?.slice(0, 3).forEach((merchant) => {
    recommendations.push({
      type: "subscription",
      title: "בית עסק חוזר זוהה",
      message: `${merchant.name} חויב ${merchant.transactions} פעמים ב־${latestMonth.label}.`,
      potentialSaving: Math.round(merchant.total * 0.25),
    });
  });

  if (sortedMonths.length >= 2) {
    const prevMonth = sortedMonths[sortedMonths.length - 2];

    if (prevMonth?.totalExpenses) {
      const growth =
        ((latestMonth.totalExpenses - prevMonth.totalExpenses) /
          prevMonth.totalExpenses) *
        100;

      if (growth > 20) {
        recommendations.push({
          type: "trend",
          title: "עלייה חדה בהוצאות",
          message: `הוצאות ${latestMonth.label} עלו ב־${growth.toFixed(
            1
          )}% לעומת ${prevMonth.label}.`,
          potentialSaving: Math.round(latestMonth.totalExpenses * 0.1),
        });
      }
    }
  }

  recommendations.push({
    type: "saving",
    title: "פוטנציאל חיסכון חודשי",
    message: `לפי מבנה ההוצאות של ${latestMonth.label}, AI מזהה אפשרות להתייעלות כללית.`,
    potentialSaving: Math.round(totalExpenses * 0.08),
  });

  return recommendations;
}

export default function AIRecommendationsPanel() {
  const months = buildMonthModels();
  const recommendations = generateRecommendations(months);
  const totalPotentialSaving = recommendations.reduce(
    (sum, item) => sum + Math.abs(Number(item.potentialSaving || 0)),
    0
  );

  const styles = {
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    subscription: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    trend: "border-rose-400/20 bg-rose-400/10 text-rose-100",
    saving: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    neutral: "border-white/10 bg-white/[0.04] text-slate-100",
  };

  const icons = {
    warning: "⚠️",
    subscription: "🔁",
    trend: "📈",
    saving: "💡",
    neutral: "🧠",
  };

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="text-3xl font-black text-white">
            AI Recommendations
          </div>

          <div className="text-slate-400 text-sm mt-1">
            המלצות פיננסיות חכמות לפי דפוסי ההוצאות שלך
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/20 px-4 py-3 text-emerald-300 font-bold">
          חיסכון אפשרי: {formatCurrency(totalPotentialSaving)}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {recommendations.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className={`rounded-3xl border p-5 ${
              styles[item.type] || styles.neutral
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{icons[item.type] || "🧠"}</div>

                <div>
                  <div className="font-black text-xl">{item.title}</div>
                  <div className="text-sm leading-7 mt-2 opacity-90">
                    {item.message}
                  </div>
                </div>
              </div>

              <div className="shrink-0 rounded-2xl bg-black/20 px-4 py-3 text-sm font-black">
                {formatCurrency(item.potentialSaving)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}