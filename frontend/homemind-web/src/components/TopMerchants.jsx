import { useState } from "react";
import { loadFinancialHistory } from "../services/financialHistoryVault";
import { resolveTransactionCategory } from "../services/transactionStore";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function getMerchantStats(month) {
  const expenses = (month.transactions || []).filter(
    (tx) => tx.type === "expense"
  );

  const total = expenses.reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0
  );

  return Object.values(
    expenses.reduce((acc, tx) => {
      const merchant = tx.merchant || tx.description || "לא ידוע";
      const category = resolveTransactionCategory(tx);

      if (!acc[merchant]) {
        acc[merchant] = {
          merchant,
          amount: 0,
          count: 0,
          categories: new Set(),
        };
      }

      acc[merchant].amount += Math.abs(Number(tx.amount || 0));
      acc[merchant].count += 1;
      acc[merchant].categories.add(category);

      return acc;
    }, {})
  )
    .map((item) => ({
      ...item,
      categories: Array.from(item.categories),
      percent: total > 0 ? (item.amount / total) * 100 : 0,
      recurring: item.count >= 2,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12);
}

export default function TopMerchants() {
  const history = loadFinancialHistory();
  const [selectedMonthId, setSelectedMonthId] = useState(
    history[history.length - 1]?.id || ""
  );

  const selectedMonth =
    history.find((month) => month.id === selectedMonthId) ||
    history[history.length - 1];

  const merchants = selectedMonth ? getMerchantStats(selectedMonth) : [];

  if (!history.length) {
    return (
      <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
        <div className="text-3xl font-black">בתי עסק מובילים</div>
        <div className="text-slate-400 mt-2">
          עדיין אין נתונים להצגת בתי עסק מובילים.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7 gap-5">
        <div>
          <div className="text-3xl font-black text-white">בתי עסק מובילים</div>

          <div className="text-slate-400 text-sm mt-1">
            בתי העסק המשמעותיים ביותר לפי חודש ולפי מיפוי קטגוריות מדויק
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {merchants.map((item, index) => (
          <div
            key={item.merchant}
            className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5 hover:bg-white/[0.07] transition-all"
          >
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300 font-black">
                    {index + 1}
                  </div>

                  <div className="font-black text-xl truncate">
                    {item.merchant}
                  </div>
                </div>

                <div className="text-slate-400 text-sm mt-3 leading-6">
                  {item.count} עסקאות · {item.percent.toFixed(1)}% מהוצאות החודש
                </div>

                <div className="text-slate-500 text-xs mt-2">
                  {item.categories.join(" · ")}
                </div>
              </div>

              <div className="text-left shrink-0">
                <div className="text-2xl font-black text-cyan-300">
                  {formatCurrency(item.amount)}
                </div>

                {item.recurring && (
                  <div className="mt-2 rounded-xl bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 text-emerald-300 text-xs font-bold">
                    חוזר
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 h-3 rounded-full bg-white/10 overflow-hidden">
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