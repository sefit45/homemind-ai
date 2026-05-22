import { useState } from "react";
import BankStatementImportCenter from "./BankStatementImportCenter";
import TransactionImportCenter from "./TransactionImportCenter";
import RawTransactionsTable from "./RawTransactionsTable";
import { getBankTransactions } from "../services/bankTransactionsStore";
import { loadStoredTransactions } from "../services/transactionStore";
import { loadFinancialHistory } from "../services/financialHistoryVault";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("he-IL");
}

export default function FinancialDataHub({ onTransactionsProcessed }) {
  const [showBankImport, setShowBankImport] = useState(false);
  const [showCreditImport, setShowCreditImport] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const bank = getBankTransactions();
  const credit = loadStoredTransactions();
  const history = loadFinancialHistory();

  const all = [...bank, ...credit];

  const income = all
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const expenses = all
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const stats = {
    bankCount: bank.length,
    creditCount: credit.filter((tx) => tx.source !== "bank_statement").length,
    monthsCount: history.length,
    income,
    expenses,
    net: income - expenses,
  };

  return (
    <section
      dir="rtl"
      className="rounded-[34px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-7"
    >
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 mb-7">
        <div>
          <div className="text-3xl font-black text-white">
            מרכז הנתונים הפיננסיים
          </div>

          <div className="text-slate-400 mt-2">
            העלאת קבצי עו״ש ואשראי, בדיקת מיפוי, היסטוריה חודשית ותזרים חכם
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/20 px-5 py-3 text-emerald-300 font-black">
          AI Data Hub פעיל
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-7">
        <div className="rounded-3xl bg-[#07111F]/80 border border-cyan-400/20 p-5">
          <div className="text-slate-400 text-sm">תנועות עו״ש</div>
          <div className="text-4xl font-black text-cyan-300 mt-2">
            {formatNumber(stats.bankCount)}
          </div>
        </div>

        <div className="rounded-3xl bg-[#07111F]/80 border border-blue-400/20 p-5">
          <div className="text-slate-400 text-sm">תנועות אשראי</div>
          <div className="text-4xl font-black text-blue-300 mt-2">
            {formatNumber(stats.creditCount)}
          </div>
        </div>

        <div className="rounded-3xl bg-[#07111F]/80 border border-purple-400/20 p-5">
          <div className="text-slate-400 text-sm">חודשים פיננסיים</div>
          <div className="text-4xl font-black text-purple-300 mt-2">
            {formatNumber(stats.monthsCount)}
          </div>
        </div>

        <div className="rounded-3xl bg-[#07111F]/80 border border-emerald-400/20 p-5">
          <div className="text-slate-400 text-sm">תזרים נטו</div>
          <div
            className={`text-3xl font-black mt-2 ${
              stats.net >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            ₪{Math.round(stats.net).toLocaleString("he-IL")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-7">
        <button
          type="button"
          onClick={() => setShowBankImport((value) => !value)}
          className="rounded-[28px] border border-cyan-400/20 bg-cyan-400/10 p-6 text-right hover:bg-cyan-400/15 transition-all"
        >
          <div className="text-4xl mb-4">🏦</div>
          <div className="text-2xl font-black text-white">ייבוא עו״ש</div>
          <div className="text-slate-400 mt-2">
            העלאת קובץ בנק, הכנסות, הוצאות ותזרים
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowCreditImport((value) => !value)}
          className="rounded-[28px] border border-blue-400/20 bg-blue-400/10 p-6 text-right hover:bg-blue-400/15 transition-all"
        >
          <div className="text-4xl mb-4">💳</div>
          <div className="text-2xl font-black text-white">ייבוא אשראי</div>
          <div className="text-slate-400 mt-2">
            העלאת קובצי MAX / אשראי ומיפוי עסקאות
          </div>
        </button>
      </div>

      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 mb-7">
        <div className="text-xl font-black text-emerald-300 mb-2">
          מצב מערכת
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-slate-300">
          <div>✅ עו״ש: {formatNumber(stats.bankCount)} תנועות</div>
          <div>✅ אשראי: {formatNumber(stats.creditCount)} תנועות</div>
          <div>✅ חודשים: {formatNumber(stats.monthsCount)}</div>
          <div>✅ המיפוי פעיל</div>
        </div>
      </div>

      {showBankImport && (
        <div className="mb-7">
          <BankStatementImportCenter />
        </div>
      )}

      {showCreditImport && (
        <div className="mb-7">
          <TransactionImportCenter
            onTransactionsProcessed={onTransactionsProcessed}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowDebug((value) => !value)}
          className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-slate-200 font-bold hover:bg-white/[0.09]"
        >
          {showDebug ? "הסתר מצב בדיקה" : "פתח מצב בדיקה"}
        </button>
      </div>

      {showDebug && (
        <div className="mt-7">
          <RawTransactionsTable />
        </div>
      )}
    </section>
  );
}
