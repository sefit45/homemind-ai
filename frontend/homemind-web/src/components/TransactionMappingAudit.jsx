import { useMemo } from "react";

function formatCurrency(value) {
  const number = Number(value || 0);
  return `₪${Math.abs(number).toLocaleString("he-IL")}`;
}

function getConfidenceStyle(confidence) {
  if (confidence >= 90) {
    return "bg-emerald-400/10 text-emerald-300 border-emerald-400/30";
  }

  if (confidence >= 75) {
    return "bg-amber-400/10 text-amber-300 border-amber-400/30";
  }

  return "bg-rose-400/10 text-rose-300 border-rose-400/30";
}

export default function TransactionMappingAudit({ transactions = [] }) {
  const audit = useMemo(() => {
    const total = transactions.length;
    const highConfidence = transactions.filter(
      (tx) => Number(tx.confidence || 0) >= 90
    ).length;

    const requiresReview = transactions.filter(
      (tx) => tx.requiresReview || Number(tx.confidence || 0) < 80
    ).length;

    const categories = new Set(
      transactions.map((tx) => tx.category || "לא זוהה")
    ).size;

    return {
      total,
      highConfidence,
      requiresReview,
      categories,
    };
  }, [transactions]);

  if (!transactions.length) {
    return null;
  }

  return (
    <section
      dir="rtl"
      className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7"
    >
      <div className="flex items-start justify-between gap-5 mb-7">
        <div>
          <div className="text-3xl font-black text-white">
            מנוע אימות ומיפוי טרנזקציות
          </div>

          <div className="text-slate-400 text-sm mt-2">
            בדיקת איכות מיפוי אוטומטי של כל העסקאות שנקלטו
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-black text-cyan-300">
            {audit.total ? Math.round((audit.highConfidence / audit.total) * 100) : 0}%
          </div>

          <div className="text-slate-400 text-sm">רמת ביטחון ממוצעת</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-7">
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
          <div className="text-3xl font-black text-emerald-300">{audit.total}</div>
          <div className="text-slate-300 mt-2">עסקאות שנקלטו</div>
        </div>

        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
          <div className="text-3xl font-black text-cyan-300">
            {audit.highConfidence}
          </div>
          <div className="text-slate-300 mt-2">זוהו בביטחון גבוה</div>
        </div>

        <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-5">
          <div className="text-3xl font-black text-rose-300">
            {audit.requiresReview}
          </div>
          <div className="text-slate-300 mt-2">דורשות בדיקה</div>
        </div>

        <div className="rounded-3xl border border-indigo-400/20 bg-indigo-400/10 p-5">
          <div className="text-3xl font-black text-indigo-300">
            {audit.categories}
          </div>
          <div className="text-slate-300 mt-2">קטגוריות</div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 overflow-hidden">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_1.2fr] bg-white/[0.04] text-slate-400 text-sm font-bold px-5 py-4">
          <div>בית עסק</div>
          <div>סכום</div>
          <div>קטגוריה</div>
          <div>רמת ביטחון</div>
          <div>מקור</div>
          <div>סיבת מיפוי</div>
        </div>

        <div className="max-h-[620px] overflow-y-auto">
          {transactions.map((tx, index) => (
            <div
              key={`${tx.id}-${index}`}
              className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_1.2fr] items-center border-t border-white/10 px-5 py-4 hover:bg-white/[0.03]"
            >
              <div>
                <div className="font-black text-white">
                  {tx.merchant || tx.description || "ללא שם"}
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  {tx.date} · שורה {tx.sourceRow || "-"}
                </div>
              </div>

              <div className="font-black text-cyan-300">
                {formatCurrency(tx.amount)}
              </div>

              <div className="text-white font-bold">
                {tx.category || "לא זוהה"}
              </div>

              <div>
                <span
                  className={`inline-flex rounded-2xl border px-4 py-2 text-sm font-black ${getConfidenceStyle(
                    Number(tx.confidence || 0)
                  )}`}
                >
                  {tx.confidence || 0}%
                </span>
              </div>

              <div className="text-slate-300 text-sm">
                {tx.sourceSheet || tx.issuer || "MAX"}
              </div>

              <div className="text-slate-400 text-sm">
                {tx.mappingReason || "מיפוי רגיל"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}