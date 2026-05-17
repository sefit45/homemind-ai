import { useMemo } from "react";
import { getBankTransactions } from "../services/bankTransactionsStore";

function formatCurrency(value) {
  const number = Number(value || 0);

  return `₪${number.toLocaleString("he-IL", {
    maximumFractionDigits: 2,
  })}`;
}

export default function RawTransactionsTable() {
  const transactions = getBankTransactions();

  const analysis = useMemo(() => {
    const duplicatedRows = {};
    const duplicatedIds = {};

    transactions.forEach((tx) => {
      duplicatedIds[tx.id] = (duplicatedIds[tx.id] || 0) + 1;

      const rowKey = [
        tx.date,
        tx.description,
        tx.amount,
        tx.balance,
        tx.reference,
      ]
        .map((value) => String(value ?? "").trim())
        .join("|");

      duplicatedRows[rowKey] = (duplicatedRows[rowKey] || 0) + 1;
    });

    const duplicateIdCount = Object.values(duplicatedIds).filter(
      (count) => count > 1
    ).length;

    const duplicateRowCount = Object.values(duplicatedRows).filter(
      (count) => count > 1
    ).length;

    const suspiciousBalanceRows = transactions.filter((tx) => {
      const amount = Math.abs(Number(tx.amount || 0));
      const balance = Math.abs(Number(tx.balance || 0));

      return balance > 50000 && amount === balance;
    });

    const incomeTransactions = transactions.filter(
      (tx) => Number(tx.amount || 0) > 0
    );

    const expenseTransactions = transactions.filter(
      (tx) => Number(tx.amount || 0) < 0
    );

    const totalIncome = incomeTransactions.reduce(
      (sum, tx) => sum + Number(tx.amount || 0),
      0
    );

    const totalExpenses = expenseTransactions.reduce(
      (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
      0
    );

    const topIncomeTransactions = [...incomeTransactions]
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 10);

    return {
      duplicateIdCount,
      duplicateRowCount,
      suspiciousBalanceRows,
      totalIncome,
      totalExpenses,
      topIncomeTransactions,
    };
  }, [transactions]);

  return (
    <section
      dir="rtl"
      className="rounded-[34px] border border-rose-400/20 bg-rose-500/[0.045] backdrop-blur-xl p-7"
    >
      <div className="flex items-center justify-between gap-5 mb-7">
        <div>
          <div className="text-3xl font-black text-white">
            בדיקת RAW של תנועות עו״ש
          </div>

          <div className="text-slate-400 mt-1">
            בדיקת נתונים גולמיים: סכום, יתרה, כפילויות ותנועות חשודות
          </div>
        </div>

        <div className="rounded-2xl bg-cyan-400/10 border border-cyan-400/20 px-5 py-3 text-cyan-300 font-black">
          {transactions.length.toLocaleString("he-IL")} תנועות
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-7">
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <div className="text-slate-400">הכנסות RAW</div>
          <div className="text-2xl font-black text-emerald-300 mt-2">
            {formatCurrency(analysis.totalIncome)}
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <div className="text-slate-400">הוצאות RAW</div>
          <div className="text-2xl font-black text-rose-300 mt-2">
            {formatCurrency(analysis.totalExpenses)}
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <div className="text-slate-400">כפילויות שורות</div>
          <div className="text-2xl font-black text-yellow-300 mt-2">
            {analysis.duplicateRowCount}
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <div className="text-slate-400">שורות חשודות</div>
          <div className="text-2xl font-black text-orange-300 mt-2">
            {analysis.suspiciousBalanceRows.length}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-5 mb-7">
        <div className="text-xl font-black mb-4">
          10 ההכנסות הגדולות ביותר בקובץ
        </div>

        <div className="space-y-3">
          {analysis.topIncomeTransactions.map((tx, index) => (
            <div
              key={`${tx.id}-${index}`}
              className="grid grid-cols-[130px_1fr_140px] gap-4 rounded-2xl bg-white/[0.04] border border-white/10 p-4"
            >
              <div className="text-slate-300">{tx.date}</div>

              <div className="font-bold truncate">
                {tx.description || tx.merchant}
              </div>

              <div className="text-emerald-300 font-black text-left">
                {formatCurrency(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-3xl border border-white/10 max-h-[650px]">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.08] sticky top-0">
            <tr>
              <th className="p-4 text-right">#</th>
              <th className="p-4 text-right">תאריך</th>
              <th className="p-4 text-right">תיאור</th>
              <th className="p-4 text-right">סכום</th>
              <th className="p-4 text-right">יתרה</th>
              <th className="p-4 text-right">סוג</th>
              <th className="p-4 text-right">קטגוריה</th>
              <th className="p-4 text-right">שורה</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((tx, index) => (
              <tr
                key={`${tx.id}-${index}`}
                className="border-t border-white/5 hover:bg-white/[0.04]"
              >
                <td className="p-4 text-slate-500">{index + 1}</td>

                <td className="p-4 whitespace-nowrap">{tx.date}</td>

                <td className="p-4 min-w-[320px] font-bold">
                  {tx.description || tx.merchant}
                </td>

                <td
                  className={`p-4 font-black whitespace-nowrap ${
                    Number(tx.amount || 0) >= 0
                      ? "text-emerald-300"
                      : "text-rose-300"
                  }`}
                >
                  {formatCurrency(tx.amount)}
                </td>

                <td className="p-4 text-cyan-300 font-bold whitespace-nowrap">
                  {formatCurrency(tx.balance)}
                </td>

                <td className="p-4">{tx.type}</td>

                <td className="p-4">{tx.category}</td>

                <td className="p-4 text-slate-500">
                  {tx.sourceRow || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}