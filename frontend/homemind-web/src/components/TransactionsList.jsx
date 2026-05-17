import { useState } from "react";
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

function formatCurrency(value) {
  const number = Number(value || 0);
  const absValue = Math.abs(number).toLocaleString("he-IL", {
    maximumFractionDigits: 2,
  });

  if (number < 0) return `-₪${absValue}`;
  return `+₪${absValue}`;
}

function getCategoryIcon(category) {
  const icons = {
    "מזון וצריכה": "🛒",
    "מזון וסופר": "🛒",
    "מנויים וטכנולוגיה": "🤖",
    "מחשבים וטכנולוגיה": "💻",
    "AI וטכנולוגיה": "🤖",
    "בילויים ומסעדות": "🍽️",
    "מסעדות ובתי קפה": "☕",
    "קריפטו והשקעות": "🪙",
    "פארם וקוסמטיקה": "💊",
    "רפואה ובתי מרקחת": "🏥",
    "תחבורה ודלק": "⛽",
    "עמלות והעברות": "💳",
    "הלוואות": "🏦",
    "ביטוח": "🛡️",
    "דיור": "🏠",
    "חשבונות": "🧾",
    "העברות": "🔁",
    "חסכון": "💰",
    אופנה: "👕",
    "חשמל ותקשורת": "💧",
    הכנסה: "💼",
    שונות: "📦",
  };

  return icons[category] || "💳";
}

function normalizeDateValue(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function sortByLatest(transactions) {
  return [...transactions].sort((a, b) => {
    const dateA = normalizeDateValue(a.date);
    const dateB = normalizeDateValue(b.date);

    if (dateB !== dateA) return dateB - dateA;

    return Number(b.sourceRow || 0) - Number(a.sourceRow || 0);
  });
}

export default function TransactionsList({ transactions = [] }) {
  const [editingId, setEditingId] = useState("");
  const [localTransactions, setLocalTransactions] = useState(transactions);

  const displayTransactions = sortByLatest(
    localTransactions.length ? localTransactions : transactions
  ).slice(0, 12);

  const handleCategoryChange = (tx, category) => {
    if (!tx?.id || !category) return;

    if (tx.source === "bank_statement") {
      updateBankTransactionCategory(tx.id, category);
    } else {
      updateStoredTransactionCategory(tx.id, category);
    }

    setLocalTransactions((current) =>
      current.map((item) =>
        String(item.id) === String(tx.id)
          ? {
              ...item,
              category,
              mappedCategory: category,
              userCorrectedCategory: true,
            }
          : item
      )
    );

    setEditingId("");
  };

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-7 min-w-0">
      <div className="flex items-center justify-between mb-6 gap-5">
        <div>
          <div className="text-2xl font-black">עסקאות אחרונות</div>
          <div className="text-slate-400 mt-1">
            אפשר לתקן קטגוריה — וה־AI ילמד לפעם הבאה
          </div>
        </div>

        <div className="rounded-2xl bg-cyan-400/10 border border-cyan-400/20 px-4 py-3 text-sm text-cyan-300 font-bold shrink-0">
          {transactions.length.toLocaleString("he-IL")} עסקאות
        </div>
      </div>

      {!displayTransactions.length && (
        <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5 text-slate-400">
          עדיין אין עסקאות אמיתיות להצגה. העלה קובץ MAX או בנק.
        </div>
      )}

      <div className="space-y-3">
        {displayTransactions.map((tx, index) => (
          <div
            key={`${tx.id || tx.date}-${tx.merchant}-${tx.amount}-${tx.sourceRow}-${index}`}
            className="group grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-3xl border border-white/10 bg-[#07111F]/70 p-4 hover:bg-white/[0.07] hover:border-cyan-400/30 transition-all duration-300 min-w-0"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:scale-105 transition-transform shrink-0">
                {getCategoryIcon(tx.category)}
              </div>

              <div className="min-w-0">
                <div className="font-black text-lg truncate">
                  {tx.merchant || tx.description || "ללא שם בית עסק"}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1 flex-wrap">
                  {editingId === tx.id ? (
                    <select
                      autoFocus
                      value={tx.category || "שונות"}
                      onChange={(event) =>
                        handleCategoryChange(tx, event.target.value)
                      }
                      onBlur={() => setEditingId("")}
                      className="rounded-xl bg-black/40 border border-cyan-400/30 text-white px-3 py-2 outline-none"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <span>{tx.category || "שונות"}</span>

                      <button
                        type="button"
                        onClick={() => setEditingId(tx.id)}
                        className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-300 font-bold hover:bg-cyan-400/20"
                      >
                        שנה
                      </button>
                    </>
                  )}

                  <span>•</span>
                  <span>{tx.date || "ללא תאריך"}</span>

                  {tx.userCorrectedCategory && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-300 font-bold">
                        AI למד
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`text-[clamp(16px,1.4vw,22px)] font-black flex items-center whitespace-nowrap tabular-nums ${
                Number(tx.amount || 0) >= 0
                  ? "text-emerald-300"
                  : "text-rose-300"
              }`}
            >
              {formatCurrency(tx.amount)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}