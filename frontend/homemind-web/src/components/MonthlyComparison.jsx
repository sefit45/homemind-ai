import { loadFinancialHistory } from "../services/financialHistoryVault";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function getMonthStats(month) {
  const transactions = month.transactions || [];

  const expenses = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const income = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const categoryTotals = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => {
      const category = tx.category || "לא מסווג";
      acc[category] = (acc[category] || 0) + Math.abs(Number(tx.amount || 0));
      return acc;
    }, {});

  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    id: month.id,
    label: month.label,
    count: transactions.length,
    expenses,
    income,
    net: income - expenses,
    topCategoryName: topCategory ? topCategory[0] : "אין נתונים",
    topCategoryAmount: topCategory ? topCategory[1] : 0,
  };
}

function getChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export default function MonthlyComparison() {
  const history = loadFinancialHistory();
  const stats = history.map(getMonthStats);

  if (!stats.length) {
    return (
      <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
        <div className="text-3xl font-black">Monthly Comparison</div>
        <div className="text-slate-400 mt-2">
          עדיין אין מספיק חודשים להשוואה. העלה קבצי עסקאות לפי חודשים.
        </div>
      </section>
    );
  }

  const maxExpense = Math.max(...stats.map((item) => item.expenses), 1);

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="text-3xl font-black text-white">
            Monthly Comparison
          </div>
          <div className="text-slate-400 text-sm mt-1">
            השוואת חודשים לפי הוצאות, הכנסות, תזרים וקטגוריה מובילה
          </div>
        </div>

        <div className="rounded-2xl bg-cyan-400/10 border border-cyan-400/20 px-4 py-3 text-cyan-300 font-bold">
          {stats.length} חודשים
        </div>
      </div>

      <div className="space-y-4">
        {stats.map((month, index) => {
          const previous = stats[index - 1];
          const expenseChange = getChange(month.expenses, previous?.expenses);
          const barWidth = Math.max((month.expenses / maxExpense) * 100, 6);

          return (
            <div
              key={month.id}
              className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                <div className="min-w-[180px]">
                  <div className="text-2xl font-black">{month.label}</div>
                  <div className="text-slate-400 text-sm mt-1">
                    {month.count} עסקאות
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-slate-400 text-sm">הוצאות</div>
                    <div className="text-rose-300 font-black">
                      {formatCurrency(month.expenses)}
                    </div>
                  </div>

                  <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-400"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 min-w-[520px]">
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                    <div className="text-slate-400 text-xs">הכנסות</div>
                    <div className="text-emerald-300 font-black mt-1">
                      {formatCurrency(month.income)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                    <div className="text-slate-400 text-xs">נטו</div>
                    <div
                      className={`font-black mt-1 ${
                        month.net >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {month.net >= 0 ? "+" : "-"}
                      {formatCurrency(month.net)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                    <div className="text-slate-400 text-xs">שינוי הוצאות</div>
                    <div
                      className={`font-black mt-1 ${
                        expenseChange === null
                          ? "text-slate-300"
                          : expenseChange > 0
                          ? "text-rose-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {expenseChange === null
                        ? "—"
                        : `${expenseChange > 0 ? "+" : ""}${expenseChange.toFixed(
                            1
                          )}%`}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                    <div className="text-slate-400 text-xs">קטגוריה מובילה</div>
                    <div className="text-cyan-300 font-black mt-1 truncate">
                      {month.topCategoryName}
                    </div>
                    <div className="text-slate-400 text-xs mt-1">
                      {formatCurrency(month.topCategoryAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}