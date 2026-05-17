import { useState } from "react";
import { loadFinancialHistory } from "../services/financialHistoryVault";
import { resolveTransactionCategory } from "../services/transactionStore";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function getCategoryStats(month) {
  const expenses = (month.transactions || []).filter(
    (tx) => tx.type === "expense"
  );

  const total = expenses.reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0
  );

  return Object.entries(
    expenses.reduce((acc, tx) => {
      const category = resolveTransactionCategory(tx);

      if (!acc[category]) {
        acc[category] = {
          category,
          amount: 0,
          count: 0,
        };
      }

      acc[category].amount += Math.abs(Number(tx.amount || 0));
      acc[category].count += 1;

      return acc;
    }, {})
  )
    .map(([, value]) => ({
      ...value,
      percent: total > 0 ? (value.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export default function CategoryBreakdown() {
  const history = loadFinancialHistory();
  const [selectedMonthId, setSelectedMonthId] = useState(
    history[history.length - 1]?.id || ""
  );

  const selectedMonth =
    history.find((month) => month.id === selectedMonthId) ||
    history[history.length - 1];

  const categories = selectedMonth ? getCategoryStats(selectedMonth) : [];

  if (!history.length) {
    return (
      <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
        <div className="text-3xl font-black">פירוט לפי קטגוריות</div>
        <div className="text-slate-400 mt-2">
          עדיין אין נתונים להצגת קטגוריות. העלה קבצי עסקאות לפי חודשים.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7 gap-5">
        <div>
          <div className="text-3xl font-black text-white">
            פירוט לפי קטגוריות
          </div>
          <div className="text-slate-400 text-sm mt-1">
            פיצול הוצאות לפי המיפוי המדויק של הטרנזקציות
          </div>
        </div>

        <select
          value={selectedMonth?.id}
          onChange={(event) => setSelectedMonthId(event.target.value)}
          className="rounded-2xl bg-black/30 border border-white/10 px-5 py-3 text-white outline-none"
        >
          {history.map((month) => (
            <option key={month.id} value={month.id}>
              {month.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {categories.map((item) => (
          <div
            key={item.category}
            className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5"
          >
            <div className="flex items-center justify-between gap-5 mb-3">
              <div>
                <div className="text-xl font-black">{item.category}</div>
                <div className="text-slate-400 text-sm mt-1">
                  {item.count} עסקאות · {item.percent.toFixed(1)}% מהוצאות החודש
                </div>
              </div>

              <div className="text-2xl font-black text-cyan-300">
                {formatCurrency(item.amount)}
              </div>
            </div>

            <div className="h-4 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                style={{ width: `${Math.max(item.percent, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}