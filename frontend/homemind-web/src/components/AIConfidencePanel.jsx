import { useMemo, useState } from "react";
import {
  getConfidenceSummary,
  getTransactionsNeedingReview,
} from "../services/unifiedTransactionsEngine";
import {
  approveTransactionLearning,
  rejectTransactionLearning,
  saveTransactionLearning,
  getLearningStats,
} from "../services/transactionLearningStore";
import { updateStoredTransactionCategory } from "../services/transactionStore";
import { updateBankTransactionCategory } from "../services/bankTransactionsStore";

const CATEGORIES = [
  "מזון וצריכה",
  "מסעדות ובתי קפה",
  "תחבורה ודלק",
  "רפואה ובתי מרקחת",
  "מחשבים וטכנולוגיה",
  "קריפטו והשקעות",
  "הכנסה",
  "הלוואות",
  "ביטוח",
  "דיור",
  "חשבונות",
  "העברות",
  "חסכון",
  "עמלות והעברות",
  "אופנה",
  "שונות",
];

const TYPES = [
  { value: "income", label: "הכנסה" },
  { value: "expense", label: "הוצאה" },
  { value: "transfer", label: "העברה פנימית" },
];

function getColor(score) {
  if (score >= 90) {
    return "text-emerald-300 border-emerald-400/20 bg-emerald-400/10";
  }

  if (score >= 70) {
    return "text-yellow-300 border-yellow-400/20 bg-yellow-400/10";
  }

  return "text-rose-300 border-rose-400/20 bg-rose-400/10";
}

function getMerchant(tx) {
  return tx.merchant || tx.description || "";
}

export default function AIConfidencePanel() {
  const [editingId, setEditingId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const summary = useMemo(() => getConfidenceSummary(), [refreshKey]);
  const learningStats = useMemo(() => getLearningStats(), [refreshKey]);

  const reviewItems = useMemo(
    () => getTransactionsNeedingReview().slice(0, 12),
    [refreshKey]
  );

  const refresh = () => {
    setRefreshKey((value) => value + 1);
    window.dispatchEvent(new Event("homemind:transactions-updated"));
  };

  const handleCategoryUpdate = (tx, category) => {
    if (!tx?.id || !category) return;

    if (tx.source === "bank_statement") {
      updateBankTransactionCategory(tx.id, category);
    } else {
      updateStoredTransactionCategory(tx.id, category);
    }

    saveTransactionLearning({
      merchant: getMerchant(tx),
      category,
      type: tx.type || "",
      confidence: 100,
      confirmed: true,
      rejected: false,
      note: "ai_training_category_update",
    });

    setEditingId("");
    refresh();
  };

  const handleTypeUpdate = (tx, type) => {
    if (!type) return;

    saveTransactionLearning({
      merchant: getMerchant(tx),
      category: tx.category || tx.mappedCategory || "",
      type,
      confidence: 100,
      confirmed: true,
      rejected: false,
      note: "ai_training_type_update",
    });

    setEditingId("");
    refresh();
  };

  const handleApprove = (tx) => {
    approveTransactionLearning(tx);
    refresh();
  };

  const handleReject = (tx) => {
    rejectTransactionLearning(tx);
    setEditingId(tx.id);
    refresh();
  };

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-7">
      <div className="flex items-start justify-between gap-5 mb-7">
        <div>
          <div className="text-3xl font-black">AI Training Center</div>
          <div className="text-slate-400 mt-1">
            עדכון קטגוריות, אישור החלטות ולימוד אישי של המנוע הפיננסי
          </div>
        </div>

        <div
          className={`rounded-2xl border px-5 py-3 font-black ${getColor(
            summary.average
          )}`}
        >
          {summary.average}% ביטחון ממוצע
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-7">
        <div className="rounded-3xl bg-[#07111F]/80 border border-white/10 p-5">
          <div className="text-slate-400 text-sm">עסקאות שנותחו</div>
          <div className="text-4xl font-black mt-2">
            {summary.total.toLocaleString("he-IL")}
          </div>
        </div>

        <div className="rounded-3xl bg-emerald-400/10 border border-emerald-400/20 p-5">
          <div className="text-slate-400 text-sm">ביטחון גבוה</div>
          <div className="text-4xl font-black text-emerald-300 mt-2">
            {summary.high.toLocaleString("he-IL")}
          </div>
        </div>

        <div className="rounded-3xl bg-yellow-400/10 border border-yellow-400/20 p-5">
          <div className="text-slate-400 text-sm">ביטחון בינוני</div>
          <div className="text-4xl font-black text-yellow-300 mt-2">
            {summary.medium.toLocaleString("he-IL")}
          </div>
        </div>

        <div className="rounded-3xl bg-rose-400/10 border border-rose-400/20 p-5">
          <div className="text-slate-400 text-sm">דורש בדיקה</div>
          <div className="text-4xl font-black text-rose-300 mt-2">
            {summary.low.toLocaleString("he-IL")}
          </div>
        </div>

        <div className="rounded-3xl bg-cyan-400/10 border border-cyan-400/20 p-5">
          <div className="text-slate-400 text-sm">חוקים שנלמדו</div>
          <div className="text-4xl font-black text-cyan-300 mt-2">
            {learningStats.totalRules.toLocaleString("he-IL")}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-xl font-black">
              עסקאות שה־AI פחות בטוח לגביהן
            </div>
            <div className="text-slate-400 text-sm mt-1">
              אפשר לאשר, לדחות, לשנות קטגוריה או ללמד סוג עסקה
            </div>
          </div>
        </div>

        {!reviewItems.length && (
          <div className="text-emerald-300 font-bold">
            מצוין — כרגע אין עסקאות שדורשות בדיקה מיוחדת.
          </div>
        )}

        <div className="space-y-3">
          {reviewItems.map((tx) => (
            <div
              key={`${tx.id}-${tx.sourceRow}`}
              className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4"
            >
              <div className="min-w-0">
                <div className="font-black truncate">
                  {tx.merchant || tx.description || "ללא שם"}
                </div>

                <div className="text-slate-400 text-sm mt-1">
                  {tx.date} · {tx.aiConfidenceReason}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-300">
                    קטגוריה: {tx.category || "שונות"}
                  </span>

                  <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-300">
                    סוג: {tx.type || "לא ידוע"}
                  </span>

                  {editingId === tx.id ? (
                    <>
                      <select
                        autoFocus
                        value={tx.category || "שונות"}
                        onChange={(event) =>
                          handleCategoryUpdate(tx, event.target.value)
                        }
                        className="rounded-xl bg-black/40 border border-cyan-400/30 text-white px-3 py-2 outline-none"
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>

                      <select
                        value={tx.type || "expense"}
                        onChange={(event) =>
                          handleTypeUpdate(tx, event.target.value)
                        }
                        className="rounded-xl bg-black/40 border border-purple-400/30 text-white px-3 py-2 outline-none"
                      >
                        {TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setEditingId("")}
                        className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.1]"
                      >
                        ביטול
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(tx)}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 font-bold hover:bg-emerald-400/20"
                      >
                        ✅ AI צדק
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReject(tx)}
                        className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300 font-bold hover:bg-rose-400/20"
                      >
                        ❌ AI טעה
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingId(tx.id)}
                        className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-300 font-bold hover:bg-cyan-400/20"
                      >
                        ✏️ עדכן
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div
                  className={`rounded-xl border px-3 py-2 font-black ${getColor(
                    tx.aiConfidence
                  )}`}
                >
                  {tx.aiConfidence}%
                </div>

                <div className="text-xs text-slate-500 whitespace-nowrap">
                  AI Confidence
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}