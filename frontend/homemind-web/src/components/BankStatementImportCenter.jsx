import { useState } from "react";
import { parseBankStatementFile } from "../services/bankStatementParser";
import {
  addBankTransactions,
  calculateBankTransactionsSummary,
  clearBankTransactions,
} from "../services/bankTransactionsStore";
import { saveTransactions } from "../services/transactionStore";
import { saveMonthToVault } from "../services/financialHistoryVault";

function groupTransactionsByMonth(transactions) {
  const groups = {};

  transactions.forEach((tx) => {
    if (!tx.importYear || !tx.importMonth) return;

    const key = `${tx.importYear}-${String(tx.importMonth).padStart(2, "0")}`;

    if (!groups[key]) {
      groups[key] = {
        year: tx.importYear,
        month: tx.importMonth,
        transactions: [],
      };
    }

    groups[key].transactions.push(tx);
  });

  return Object.values(groups);
}

export default function BankStatementImportCenter() {
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState(() =>
    calculateBankTransactionsSummary()
  );

  const refreshSummary = () => {
    setSummary(calculateBankTransactionsSummary());
    window.dispatchEvent(new Event("homemind:transactions-updated"));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setStatus("לא נבחר קובץ");
      return;
    }

    try {
      setStatus(`קורא את קובץ הבנק: ${file.name}...`);

      const result = await parseBankStatementFile(file);
      const transactions = result.transactions || [];

      if (!transactions.length) {
        setStatus(
          `הקובץ ${file.name} נקרא, אבל לא נמצאו בו תנועות תקינות לעיבוד`
        );
        return;
      }

      addBankTransactions(transactions);
      saveTransactions(transactions);

      const monthlyGroups = groupTransactionsByMonth(transactions);

      monthlyGroups.forEach((group) => {
        saveMonthToVault({
          year: group.year,
          month: group.month,
          source: "בנק עו״ש",
          transactions: group.transactions,
        });
      });

      refreshSummary();

      setStatus(
        `יובאו בהצלחה ${transactions.length} תנועות מתוך ${file.name}. נשמרו ${monthlyGroups.length} חודשים להיסטוריה הפיננסית.`
      );
    } catch (error) {
      console.error(error);
      setStatus(`שגיאה בייבוא הקובץ: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  };

  const handleClear = () => {
    clearBankTransactions();
    refreshSummary();
    setStatus("נתוני העו״ש נמחקו");
  };

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-start justify-between gap-6 mb-7">
        <div>
          <div className="text-3xl font-black">ייבוא תנועות עו״ש</div>

          <div className="text-slate-400 mt-1">
            העלה קובץ Excel / CSV מהבנק כדי לנתח הכנסות, הוצאות ותזרים
          </div>
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-3 text-rose-300 font-bold hover:bg-rose-500/20 transition-all"
        >
          נקה עו״ש
        </button>
      </div>

      <label className="block cursor-pointer rounded-[28px] border border-dashed border-cyan-400/30 bg-cyan-400/5 p-8 text-center hover:bg-cyan-400/10 transition-all">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onClick={(event) => {
            event.target.value = "";
          }}
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="text-5xl mb-4">🏦</div>

        <div className="text-2xl font-black">בחר קובץ תנועות בנק</div>

        <div className="text-slate-400 mt-2">
          תומך בקבצי Excel ו־CSV עם תאריך, תיאור, חובה/זכות ויתרה
        </div>
      </label>

      {status && (
        <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-cyan-200 font-bold">
          {status}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-7">
        <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-5">
          <div className="text-slate-400">מספר תנועות</div>

          <div className="text-4xl font-black mt-3">
            {summary.count.toLocaleString("he-IL")}
          </div>
        </div>

        <div className="rounded-3xl bg-emerald-500/10 border border-emerald-400/20 p-5">
          <div className="text-slate-400">הכנסות</div>

          <div className="text-3xl font-black mt-3 text-emerald-300">
            ₪{Math.round(summary.income).toLocaleString("he-IL")}
          </div>
        </div>

        <div className="rounded-3xl bg-rose-500/10 border border-rose-400/20 p-5">
          <div className="text-slate-400">הוצאות</div>

          <div className="text-3xl font-black mt-3 text-rose-300">
            ₪{Math.round(summary.expenses).toLocaleString("he-IL")}
          </div>
        </div>

        <div className="rounded-3xl bg-cyan-500/10 border border-cyan-400/20 p-5">
          <div className="text-slate-400">תזרים נטו</div>

          <div className="text-3xl font-black mt-3 text-cyan-300">
            ₪{Math.round(summary.netCashflow).toLocaleString("he-IL")}
          </div>
        </div>
      </div>
    </section>
  );
}