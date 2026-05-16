import {
  calculateUnifiedCashflow,
  detectRecurringTransactions,
  calculateCategoryBreakdown,
} from "../services/unifiedTransactionsEngine";

function formatCurrency(value) {
  return `₪${Math.round(Number(value || 0)).toLocaleString("he-IL")}`;
}

export default function UnifiedCashflowBrain() {
  const cashflow = calculateUnifiedCashflow();
  const recurring = detectRecurringTransactions().slice(0, 5);
  const categories = calculateCategoryBreakdown().slice(0, 5);

  return (
    <section className="rounded-[34px] border border-cyan-400/20 bg-cyan-400/10 p-7">
      <div className="flex items-start justify-between gap-6 mb-7">
        <div>
          <div className="text-3xl font-black">AI Cashflow Brain</div>
          <div className="text-slate-300 mt-1">
            ניתוח מאוחד של עו״ש + אשראי מכל המקורות
          </div>
        </div>

        <div className="rounded-2xl bg-black/20 border border-white/10 px-5 py-3 text-cyan-300 font-bold">
          {cashflow.transactionsCount.toLocaleString("he-IL")} תנועות
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-3xl bg-emerald-500/10 border border-emerald-400/20 p-5">
          <div className="text-slate-300">הכנסות</div>
          <div className="text-4xl font-black mt-3 text-emerald-300">
            {formatCurrency(cashflow.income)}
          </div>
        </div>

        <div className="rounded-3xl bg-rose-500/10 border border-rose-400/20 p-5">
          <div className="text-slate-300">הוצאות</div>
          <div className="text-4xl font-black mt-3 text-rose-300">
            {formatCurrency(cashflow.expenses)}
          </div>
        </div>

        <div className="rounded-3xl bg-cyan-500/10 border border-cyan-400/20 p-5">
          <div className="text-slate-300">תזרים נטו</div>
          <div
            className={`text-4xl font-black mt-3 ${
              cashflow.net >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatCurrency(cashflow.net)}
          </div>
        </div>
      </div>

      <div className="mt-7 rounded-3xl bg-black/20 border border-white/10 p-5">
        <div className="text-2xl font-black mb-4">תנועות חוזרות שזוהו</div>

        {recurring.length === 0 ? (
          <div className="text-slate-400">
            עדיין לא זוהו תנועות חוזרות. העלה עוד חודשים כדי לשפר את הזיהוי.
          </div>
        ) : (
          <div className="space-y-3">
            {recurring.map((item) => (
              <div
                key={item.merchant}
                className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/10 p-4"
              >
                <div>
                  <div className="font-black">{item.merchant}</div>
                  <div className="text-slate-400 text-sm">
                    {item.count} מופעים
                  </div>
                </div>

                <div className="font-black text-cyan-300">
                  ממוצע {formatCurrency(item.averageAmount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-7 rounded-3xl bg-black/20 border border-white/10 p-5">
        <div className="text-2xl font-black mb-4">קטגוריות הוצאה מובילות</div>

        {categories.length === 0 ? (
          <div className="text-slate-400">
            עדיין אין מספיק נתונים להצגת קטגוריות.
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((item) => (
              <div
                key={item.category}
                className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/10 p-4"
              >
                <div className="font-black">{item.category}</div>

                <div className="font-black text-rose-300">
                  {formatCurrency(item.total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}