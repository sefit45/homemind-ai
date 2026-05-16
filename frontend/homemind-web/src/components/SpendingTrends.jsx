import { loadFinancialHistory } from "../services/financialHistoryVault";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function getMonthlyStats() {
  return loadFinancialHistory().map((month) => {
    const expenses = (month.transactions || [])
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

    const income = (month.transactions || [])
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

    return {
      id: month.id,
      label: month.label,
      expenses,
      income,
      net: income - expenses,
      count: month.transactions?.length || 0,
    };
  });
}

export default function SpendingTrends() {
  const stats = getMonthlyStats();

  if (!stats.length) {
    return (
      <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7">
        <div className="text-3xl font-black">Spending Trends</div>
        <div className="text-slate-400 mt-2">אין עדיין נתונים להצגת מגמות.</div>
      </section>
    );
  }

  const maxExpense = Math.max(...stats.map((item) => item.expenses), 1);
  const totalExpenses = stats.reduce((sum, item) => sum + item.expenses, 0);
  const averageExpenses = totalExpenses / stats.length;
  const latest = stats[stats.length - 1];
  const previous = stats[stats.length - 2];

  const projectedNext =
    latest && previous
      ? Math.max(0, latest.expenses + (latest.expenses - previous.expenses))
      : latest.expenses;

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="text-3xl font-black text-white">Spending Trends</div>
          <div className="text-slate-400 text-sm mt-1">
            מגמות הוצאה חודשיות, ממוצע ותחזית בסיסית
          </div>
        </div>

        <div className="rounded-2xl bg-cyan-400/10 border border-cyan-400/20 px-4 py-3 text-cyan-300 font-bold">
          AI Forecast
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-7">
        <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5">
          <div className="text-slate-400 text-sm">ממוצע חודשי</div>
          <div className="text-3xl font-black text-cyan-300 mt-2">
            {formatCurrency(averageExpenses)}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5">
          <div className="text-slate-400 text-sm">החודש האחרון</div>
          <div className="text-3xl font-black text-rose-300 mt-2">
            {formatCurrency(latest.expenses)}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5">
          <div className="text-slate-400 text-sm">תחזית לחודש הבא</div>
          <div className="text-3xl font-black text-amber-300 mt-2">
            {formatCurrency(projectedNext)}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5">
          <div className="text-slate-400 text-sm">חודשים נותחו</div>
          <div className="text-3xl font-black text-emerald-300 mt-2">
            {stats.length}
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-[#07111F]/70 p-6">
        <div className="flex items-end gap-4 h-[280px] relative">
          {stats.map((month) => {
            const height = Math.max((month.expenses / maxExpense) * 100, 6);

            return (
              <div
                key={month.id}
                className="flex-1 h-full flex flex-col items-center justify-end"
              >
                <div className="text-xs text-slate-400 mb-2">
                  {formatCurrency(month.expenses)}
                </div>

                <div
                  className="w-full rounded-t-3xl bg-gradient-to-t from-cyan-500 to-blue-400 shadow-lg shadow-cyan-500/10 transition-all duration-700"
                  style={{
                    height: `${height}%`,
                    minHeight: "18px",
                  }}
                />

                <div className="text-xs text-slate-400 mt-3 text-center">
                  {month.label.replace("2026", "")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-cyan-100 leading-7">
        לפי הנתונים הקיימים, ממוצע ההוצאות החודשי שלך הוא{" "}
        <b>{formatCurrency(averageExpenses)}</b>. אם המגמה הנוכחית תימשך,
        התחזית לחודש הבא היא בערך <b>{formatCurrency(projectedNext)}</b>.
      </div>
    </section>
  );
}