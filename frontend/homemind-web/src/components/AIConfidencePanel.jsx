import { useMemo, useState } from "react";
import {
  getAllUnifiedTransactions,
  getConfidenceSummary,
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

const FILTERS = [
  { value: "all", label: "כל העסקאות" },
  { value: "review", label: "דורש בדיקה" },
  { value: "low", label: "ביטחון נמוך" },
  { value: "income", label: "הכנסות" },
  { value: "expense", label: "הוצאות" },
  { value: "transfer", label: "העברות" },
];

function formatCurrency(value) {
  return `₪${Math.round(Number(value || 0)).toLocaleString("he-IL")}`;
}

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
  return tx.merchant || tx.description || "לא ידוע";
}

function getTypeLabel(type) {
  return TYPES.find((item) => item.value === type)?.label || "לא ידוע";
}

function getTransactionAmountClass(tx) {
  if (tx.type === "income") {
    return "text-emerald-300";
  }

  if (tx.type === "transfer") {
    return "text-cyan-300";
  }

  return "text-rose-300";
}

function updateTransactionTypeLocally(tx, type) {
  
  const storageKey =
    tx.source === "bank_statement"
      ? "homemind_bank_transactions_v1"
      : "homemind_transactions_v1";

  try {
    const raw = localStorage.getItem(storageKey);
    const transactions = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(transactions)) return;

    const updated = transactions.map((item) => {
      if (String(item.id) !== String(tx.id)) return item;

      return {
        ...item,
        type,
        userCorrectedType: true,
        typeUpdatedAt: new Date().toISOString(),
      };
    });

    localStorage.setItem(storageKey, JSON.stringify(updated));
    window.dispatchEvent(new Event("homemind:transactions-updated"));
  } catch {
    // לא מפילים את המסך בגלל בעיית localStorage
  }
}

function getStableKey(tx, index) {
  return `${tx.id || "tx"}-${tx.source || ""}-${tx.sourceRow || index}-${tx.date || ""}`;
}

export default function AIConfidencePanel() {
  const [editingId, setEditingId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("review");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const summary = useMemo(() => getConfidenceSummary(), [refreshKey]);
  const learningStats = useMemo(() => getLearningStats(), [refreshKey]);

  const allTransactions = useMemo(() => {
    return getAllUnifiedTransactions();
  }, [refreshKey]);

  const categoriesInUse = useMemo(() => {
    const categories = new Set();

    allTransactions.forEach((tx) => {
      categories.add(tx.category || tx.mappedCategory || tx.aiCategory || "שונות");
    });

    return ["all", ...Array.from(categories).sort()];
  }, [allTransactions]);

  const filteredTransactions = useMemo(() => {
    const text = query.trim().toLowerCase();

    return allTransactions
      .filter((tx) => {
        if (filter === "review") return tx.needsReview;
        if (filter === "low") return Number(tx.aiConfidence || 0) < 70;
        if (filter === "income") return tx.type === "income";
        if (filter === "expense") return tx.type === "expense";
        if (filter === "transfer") return tx.type === "transfer";

        return true;
      })
      .filter((tx) => {
        if (categoryFilter === "all") return true;

        const category = tx.category || tx.mappedCategory || tx.aiCategory || "שונות";

        return category === categoryFilter;
      })
      .filter((tx) => {
        if (!text) return true;

        const haystack = [
          tx.merchant,
          tx.description,
          tx.category,
          tx.mappedCategory,
          tx.aiCategory,
          tx.date,
          tx.amount,
          tx.source,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(text);
      })
      .slice(0, 250);
  }, [allTransactions, query, filter, categoryFilter]);

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
      note: "manual_category_correction",
    });

    setEditingId("");
    refresh();
  };

  const handleTypeUpdate = (tx, type) => {
    if (!tx?.id || !type) return;

    updateTransactionTypeLocally(tx, type);

    saveTransactionLearning({
      merchant: getMerchant(tx),
      category: tx.category || tx.mappedCategory || tx.aiCategory || "",
      type,
      confidence: 100,
      confirmed: true,
      rejected: false,
      note: "manual_type_correction",
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
          <div className="text-3xl font-black">
            מרכז בקרת טרנזקציות ומיפוי AI
          </div>

          <div className="text-slate-400 mt-1">
            כאן אפשר לראות את כל העסקאות, לתקן קטגוריה, לשנות סוג עסקה וללמד את המערכת
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
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
          <div>
            <div className="text-xl font-black">כל העסקאות לבקרה ותיקון</div>
            <div className="text-slate-400 text-sm mt-1">
              מוצגות עד 250 עסקאות לפי הסינון. אפשר לחפש, לסנן ולתקן ידנית.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חפש בית עסק, תיאור, סכום או תאריך..."
              className="w-full sm:w-[320px] rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            >
              {FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            >
              {categoriesInUse.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "כל הקטגוריות" : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.06] p-4 text-sm text-cyan-100">
          מוצגות {filteredTransactions.length.toLocaleString("he-IL")} עסקאות מתוך{" "}
          {allTransactions.length.toLocaleString("he-IL")}. כל תיקון נשמר גם כ״למידה״ לפי בית עסק.
        </div>

        {!filteredTransactions.length && (
          <div className="text-emerald-300 font-bold">
            אין עסקאות שמתאימות לסינון הנוכחי.
          </div>
        )}

        <div className="space-y-3">
          {filteredTransactions.map((tx, index) => {
            const isEditing = editingId === tx.id;
            const category =
              tx.category || tx.mappedCategory || tx.aiCategory || "שונות";

            return (
              <div
                key={getStableKey(tx, index)}
                className="grid grid-cols-1 2xl:grid-cols-[1fr_auto] gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="font-black text-lg truncate">
                      {getMerchant(tx)}
                    </div>

                    <div className={`font-black ${getTransactionAmountClass(tx)}`}>
                      {formatCurrency(Math.abs(Number(tx.amount || 0)))}
                    </div>

                    <div className="text-xs text-slate-400">
                      {tx.date || "ללא תאריך"}
                    </div>

                    <div className="text-xs text-slate-500">
                      מקור: {tx.source === "bank_statement" ? "עו״ש" : "אשראי"}
                    </div>
                  </div>

                  <div className="text-slate-400 text-sm mt-2 truncate">
                    {tx.description || "ללא תיאור"}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-300">
                      קטגוריה: {category}
                    </span>

                    <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-300">
                      סוג: {getTypeLabel(tx.type)}
                    </span>

                    {tx.needsReview && (
                      <span className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300 font-bold">
                        דורש בדיקה
                      </span>
                    )}

                    {tx.userCorrectedCategory && (
                      <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 font-bold">
                        תוקן ידנית
                      </span>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-black/20 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-400 mb-2">
                            שנה קטגוריה
                          </div>

                          <select
                            value={category}
                            onChange={(event) =>
                              handleCategoryUpdate(tx, event.target.value)
                            }
                            className="w-full rounded-xl bg-black/40 border border-cyan-400/30 text-white px-3 py-3 outline-none"
                          >
                            {CATEGORIES.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="text-xs text-slate-400 mb-2">
                            שנה סוג עסקה
                          </div>

                          <select
                            value={tx.type || "expense"}
                            onChange={(event) =>
                              handleTypeUpdate(tx, event.target.value)
                            }
                            className="w-full rounded-xl bg-black/40 border border-purple-400/30 text-white px-3 py-3 outline-none"
                          >
                            {TYPES.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingId("")}
                        className="mt-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.1]"
                      >
                        סגור עריכה
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex 2xl:flex-col items-start 2xl:items-end gap-2">
                  <div
                    className={`rounded-xl border px-3 py-2 font-black ${getColor(
                      Number(tx.aiConfidence || 0)
                    )}`}
                  >
                    {Number(tx.aiConfidence || 0)}%
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApprove(tx)}
                    className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 font-bold hover:bg-emerald-400/20"
                  >
                    AI צדק
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(tx)}
                    className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300 font-bold hover:bg-rose-400/20"
                  >
                    AI טעה
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingId(tx.id)}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-300 font-bold hover:bg-cyan-400/20"
                  >
                    עדכן
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}