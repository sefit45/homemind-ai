import { useCallback, useEffect, useState } from "react";
import { loadFinancialHistory } from "../services/financialHistoryVault";

function formatCurrency(value) {
  const absValue = Math.round(Math.abs(value)).toLocaleString("he-IL");
  return value >= 0 ? `₪${absValue}` : `-₪${absValue}`;
}

function getMonthStats(month) {
  const transactions = month.transactions || [];

  const expenses = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const income = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const categoryTotals = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => {
      const category = tx.category || "כללי";
      acc[category] = (acc[category] || 0) + Math.abs(tx.amount);
      return acc;
    }, {});

  const topCategoryEntry = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return {
    count: transactions.length,
    expenses,
    income,
    net: income - expenses,
    topCategory: topCategoryEntry
      ? { name: topCategoryEntry[0], amount: topCategoryEntry[1] }
      : { name: "אין נתונים", amount: 0 },
  };
}

export default function FinancialHistoryExplorer() {
  const [history, setHistory] = useState(() => loadFinancialHistory().reverse());
  const [selectedMonthId, setSelectedMonthId] = useState(
    () => loadFinancialHistory().reverse()[0]?.id || ""
  );

  const refreshHistory = useCallback(() => {
    const nextHistory = loadFinancialHistory().reverse();

    setHistory(nextHistory);

    setSelectedMonthId((currentId) => {
      if (nextHistory.some((month) => month.id === currentId)) {
        return currentId;
      }

      return nextHistory[0]?.id || "";
    });
  }, []);

  useEffect(() => {
    window.addEventListener("homemind:transactions-updated", refreshHistory);
    window.addEventListener("homemind:history-cleared", refreshHistory);

    return () => {
      window.removeEventListener("homemind:transactions-updated", refreshHistory);
      window.removeEventListener("homemind:history-cleared", refreshHistory);
    };
  }, [refreshHistory]);

  const selectedMonth =
    history.find((month) => month.id === selectedMonthId) || history[0];

  const selectedStats = selectedMonth ? getMonthStats(selectedMonth) : null;

  if (!history.length) {
    return (
      <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
        <div className="text-3xl font-black">Financial History Explorer</div>

        <div className="text-slate-400 mt-2">
          עדיין אין חודשים שמורים. העלה קבצי MAX לפי חודש כדי לבנות היסטוריה פיננסית.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-start justify-between gap-5 mb-7">
        <div>
          <div className="text-3xl font-black text-white">
            Financial History Explorer
          </div>

          <div className="text-slate-400 text-sm mt-1">
            חודשים שנשמרו, עסקאות, תזרים וקטגוריות מובילות
          </div>
        </div>

        <div className="rounded-2xl bg-indigo-400/10 border border-indigo-400/20 px-4 py-3 text-indigo-300 font-bold">
          {history.length} חודשים
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="space-y-3">
          {history.map((month) => {
            const stats = getMonthStats(month);
            const isSelected = month.id === selectedMonth?.id;

            return (
              <button
                key={month.id}
                onClick={() => setSelectedMonthId(month.id)}
                className={`w-full text-right rounded-3xl border p-5 transition-all ${
                  isSelected
                    ? "border-cyan-400/40 bg-cyan-400/10"
                    : "border-white/10 bg-[#07111F]/70 hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-black text-xl">{month.label}</div>

                  <div className="text-cyan-300 font-bold">
                    {stats.count} עסקאות
                  </div>
                </div>

                <div className="text-slate-400 text-sm mt-2">
                  מקור: {month.source} · יובא:{" "}
                  {new Date(month.importedAt).toLocaleDateString("he-IL")}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-2xl bg-rose-400/10 border border-rose-400/20 p-3">
                    <div className="text-slate-400 text-xs">הוצאות</div>

                    <div className="text-rose-300 font-black mt-1">
                      {formatCurrency(stats.expenses)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/20 p-3">
                    <div className="text-slate-400 text-xs">הכנסות</div>

                    <div className="text-emerald-300 font-black mt-1">
                      {formatCurrency(stats.income)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[#07111F]/70 p-6">
          <div className="flex items-start justify-between gap-5 mb-6">
            <div>
              <div className="text-3xl font-black">
                {selectedMonth?.label}
              </div>

              <div className="text-slate-400 mt-1">
                {selectedMonth?.transactionCount} עסקאות נשמרו בחודש זה
              </div>
            </div>

            <div
              className={`rounded-2xl px-4 py-3 font-bold ${
                selectedStats?.net >= 0
                  ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-300"
                  : "bg-rose-400/10 border border-rose-400/20 text-rose-300"
              }`}
            >
              נטו: {formatCurrency(selectedStats?.net || 0)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-slate-400 text-sm">עסקאות</div>

              <div className="text-3xl font-black mt-2">
                {selectedStats?.count}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-slate-400 text-sm">הוצאות</div>

              <div className="text-3xl font-black mt-2 text-rose-300">
                {formatCurrency(selectedStats?.expenses || 0)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-slate-400 text-sm">הכנסות</div>

              <div className="text-3xl font-black mt-2 text-emerald-300">
                {formatCurrency(selectedStats?.income || 0)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-slate-400 text-sm">קטגוריה מובילה</div>

              <div className="text-xl font-black mt-2">
                {selectedStats?.topCategory.name}
              </div>

              <div className="text-cyan-300 font-bold mt-1">
                {formatCurrency(selectedStats?.topCategory.amount || 0)}
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {(selectedMonth?.transactions || []).map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-[1fr_auto] gap-4 rounded-3xl border border-white/10 bg-black/20 p-4"
              >
                <div>
                  <div className="font-black text-lg">{tx.merchant}</div>

                  <div className="text-slate-400 text-sm mt-1">
                    {tx.date} · {tx.category} · {tx.issuer} · confidence{" "}
                    {tx.confidence}%
                  </div>
                </div>

                <div
                  className={`text-xl font-black ${
                    tx.type === "expense"
                      ? "text-rose-300"
                      : "text-emerald-300"
                  }`}
                >
                  {tx.type === "expense" ? "-" : "+"}
                  {formatCurrency(Math.abs(tx.amount))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
