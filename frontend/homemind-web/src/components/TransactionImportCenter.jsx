import { useMemo, useState } from "react";
import { parseTransactionFile } from "../services/transactionEngine";
import { parseBankStatement } from "../services/bankStatementParser";

import {
  saveTransactions,
  loadStoredTransactions,
  clearStoredTransactions,
} from "../services/transactionStore";

import {
  saveMonthToVault,
  getVaultSummary,
  clearFinancialHistory,
} from "../services/financialHistoryVault";

const months = [
  { value: 1, label: "ינואר" },
  { value: 2, label: "פברואר" },
  { value: 3, label: "מרץ" },
  { value: 4, label: "אפריל" },
  { value: 5, label: "מאי" },
  { value: 6, label: "יוני" },
  { value: 7, label: "יולי" },
  { value: 8, label: "אוגוסט" },
  { value: 9, label: "ספטמבר" },
  { value: 10, label: "אוקטובר" },
  { value: 11, label: "נובמבר" },
  { value: 12, label: "דצמבר" },
];

const bankSources = [
  "בנק הפועלים",
  "בנק לאומי",
  "דיסקונט",
  "מזרחי",
  "יהב",
];

const allSources = ["MAX", "ישראכרט", "כאל", ...bankSources];

function isBankSource(source) {
  return bankSources.includes(source);
}

function getMonthLabel(monthValue) {
  return (
    months.find((month) => month.value === Number(monthValue))?.label ||
    monthValue
  );
}

function formatCurrency(value) {
  const num = Number(value || 0);
  const absValue = Math.abs(num).toLocaleString("he-IL");
  return num < 0 ? `-₪${absValue}` : `₪${absValue}`;
}

function getTransactionYear(tx, fallbackYear) {
  if (tx.importYear) return Number(tx.importYear);

  const date = new Date(tx.date);
  if (!Number.isNaN(date.getTime())) return date.getFullYear();

  return Number(fallbackYear);
}

function getTransactionMonth(tx, fallbackMonth) {
  if (tx.importMonth) return Number(tx.importMonth);

  const date = new Date(tx.date);
  if (!Number.isNaN(date.getTime())) return date.getMonth() + 1;

  return Number(fallbackMonth);
}

function groupTransactionsByMonth(transactions, fallbackYear, fallbackMonth) {
  const grouped = {};

  transactions.forEach((tx) => {
    const year = getTransactionYear(tx, fallbackYear);
    const month = getTransactionMonth(tx, fallbackMonth);
    const key = `${year}-${month}`;

    if (!grouped[key]) {
      grouped[key] = {
        year,
        month,
        transactions: [],
      };
    }

    grouped[key].transactions.push({
      ...tx,
      importYear: year,
      importMonth: month,
    });
  });

  return Object.values(grouped);
}

export default function TransactionImportCenter() {
  const [selectedMonth, setSelectedMonth] = useState(5);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [source, setSource] = useState("בנק הפועלים");

  const bankMode = useMemo(() => isBankSource(source), [source]);

  const [fileQueue, setFileQueue] = useState([]);
  const [processedTransactions, setProcessedTransactions] = useState([]);
  const [status, setStatus] = useState("idle");
  const [storedCount, setStoredCount] = useState(loadStoredTransactions().length);
  const [vaultSummary, setVaultSummary] = useState(getVaultSummary());
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");

  const handleAddFileToQueue = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const queueItem = {
      id: `${Date.now()}-${file.name}`,
      file,
      fileName: file.name,
      month: Number(selectedMonth),
      year: Number(selectedYear),
      source,
      isBankFile: isBankSource(source),
      status: "waiting",
      transactionCount: 0,
      error: "",
    };

    setFileQueue((currentQueue) => [...currentQueue, queueItem]);
    setImportMessage("");
    setError("");

    event.target.value = "";
  };

  const handleRemoveQueuedFile = (id) => {
    setFileQueue((currentQueue) =>
      currentQueue.filter((item) => item.id !== id)
    );
  };

  const handleClearQueue = () => {
    setFileQueue([]);
    setProcessedTransactions([]);
    setStatus("idle");
    setImportMessage("");
    setError("");
  };

  const handleProcessAllFiles = async () => {
    if (!fileQueue.length) {
      setError("לא נבחרו קבצים לעיבוד.");
      return;
    }

    setStatus("processing");
    setError("");
    setImportMessage("");
    setProcessedTransactions([]);

    const allTransactions = [];
    let totalAddedToGeneralStore = 0;
    let successCount = 0;

    for (const item of fileQueue) {
      setFileQueue((currentQueue) =>
        currentQueue.map((queueItem) =>
          queueItem.id === item.id
            ? { ...queueItem, status: "processing", error: "" }
            : queueItem
        )
      );

      try {
        const result = item.isBankFile
          ? await parseBankStatement(item.file)
          : await parseTransactionFile(item.file);

        const transactionsWithImportMeta = result.transactions.map((tx) => {
          const year = item.isBankFile
            ? getTransactionYear(tx, item.year)
            : Number(item.year);

          const month = item.isBankFile
            ? getTransactionMonth(tx, item.month)
            : Number(item.month);

          return {
            ...tx,
            issuer: item.source || result.issuer || "MAX",
            source: item.isBankFile ? "bank_statement" : "credit_card",
            importMonth: month,
            importYear: year,
            importFileName: item.fileName,
          };
        });

        const beforeCount = loadStoredTransactions().length;
        const merged = saveTransactions(transactionsWithImportMeta);
        const afterCount = merged.length;
        const addedCount = afterCount - beforeCount;

        totalAddedToGeneralStore += addedCount;

        if (item.isBankFile) {
          const monthlyGroups = groupTransactionsByMonth(
            transactionsWithImportMeta,
            item.year,
            item.month
          );

          monthlyGroups.forEach((group) => {
            saveMonthToVault({
              year: group.year,
              month: group.month,
              source: item.source,
              transactions: group.transactions,
            });
          });
        } else {
          saveMonthToVault({
            year: Number(item.year),
            month: Number(item.month),
            source: item.source || result.issuer || "MAX",
            transactions: transactionsWithImportMeta,
          });
        }

        allTransactions.push(...transactionsWithImportMeta);
        successCount += 1;

        setFileQueue((currentQueue) =>
          currentQueue.map((queueItem) =>
            queueItem.id === item.id
              ? {
                  ...queueItem,
                  status: "done",
                  transactionCount: transactionsWithImportMeta.length,
                  error: "",
                }
              : queueItem
          )
        );
      } catch (err) {
        setFileQueue((currentQueue) =>
          currentQueue.map((queueItem) =>
            queueItem.id === item.id
              ? {
                  ...queueItem,
                  status: "error",
                  transactionCount: 0,
                  error: err?.message || "שגיאה בקריאת הקובץ",
                }
              : queueItem
          )
        );
      }
    }

    const updatedVaultSummary = getVaultSummary();

    setStoredCount(loadStoredTransactions().length);
    setVaultSummary(updatedVaultSummary);
    setProcessedTransactions(allTransactions);
    setStatus("done");

    window.dispatchEvent(new Event("homemind:transactions-updated"));

    setImportMessage(
      `עובדו ${successCount} קבצים. נוספו ${totalAddedToGeneralStore} עסקאות חדשות למאגר הכללי. ההיסטוריה כוללת עכשיו ${updatedVaultSummary.monthsCount} חודשים ו־${updatedVaultSummary.transactionsCount} עסקאות.`
    );
  };

  const handleClearAll = () => {
    clearStoredTransactions();
    clearFinancialHistory();

    setStoredCount(0);
    setVaultSummary(getVaultSummary());
    setFileQueue([]);
    setProcessedTransactions([]);
    setStatus("idle");
    setError("");
    setImportMessage("כל העסקאות וההיסטוריה החודשית נמחקו מהמכשיר המקומי.");

    window.dispatchEvent(new Event("homemind:history-cleared"));
  };

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7 gap-5">
        <div>
          <div className="text-3xl font-black text-white">
            Transaction Import Center
          </div>

          <div className="text-slate-400 text-sm mt-1">
            מנגנון אחד לקליטת אשראי ועו״ש — לפי מקור הקובץ שנבחר
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/20 px-4 py-3 text-emerald-300 font-bold">
            Stored: {storedCount}
          </div>

          <div className="rounded-2xl bg-indigo-400/10 border border-indigo-400/20 px-4 py-3 text-indigo-300 font-bold">
            Months: {vaultSummary.monthsCount}
          </div>

          <div className="rounded-2xl bg-cyan-400/10 border border-cyan-400/20 px-4 py-3 text-cyan-300 font-bold">
            Import Engine
          </div>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 mb-6 ${
          bankMode ? "xl:grid-cols-3" : "xl:grid-cols-4"
        }`}
      >
        {!bankMode && (
          <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-4">
            <div className="text-slate-400 text-sm mb-2">
              חודש לקובץ הבא
            </div>

            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(Number(event.target.value))
              }
              className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white outline-none"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-4">
          <div className="text-slate-400 text-sm mb-2">
            שנה
          </div>

          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white outline-none"
          >
            {[2026, 2025, 2024].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-4">
          <div className="text-slate-400 text-sm mb-2">
            מקור
          </div>

          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white outline-none"
          >
            {allSources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#07111F]/70 p-4">
          <div className="text-slate-400 text-sm mb-2">
            היסטוריה קיימת
          </div>

          <div className="text-2xl font-black">
            {vaultSummary.transactionsCount.toLocaleString("he-IL")} עסקאות
          </div>

          <div className="text-slate-500 text-sm mt-1">
            על פני {vaultSummary.monthsCount} חודשים
          </div>
        </div>
      </div>

      {bankMode && (
        <div className="mb-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-cyan-100 leading-7">
          מצב בנקאי פעיל: אין צורך לבחור חודש. המערכת תקרא את כל תנועות
          העו״ש מהקובץ, תמיין לפי תאריך ותפצל אוטומטית לפי חודשים.
        </div>
      )}

      <label className="block rounded-[30px] border border-dashed border-cyan-400/30 bg-cyan-400/5 p-8 cursor-pointer hover:bg-cyan-400/10 transition-all">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleAddFileToQueue}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-4">📤</div>

          <div className="text-2xl font-black">
            הוסף קובץ לרשימת ההעלאה
          </div>

          <div className="text-slate-400 mt-3 max-w-xl leading-7">
            {bankMode
              ? "בחר קובץ עו״ש מהבנק. המערכת תקרא את כל התנועות, תזהה תאריכים, סכומים, יתרות וקטגוריות."
              : "בחר חודש ושנה למעלה, העלה קובץ אשראי, והוא יופיע ברשימה לעיבוד."}
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 px-5 py-3 text-sm text-cyan-200">
            XLSX / CSV / XLS
          </div>
        </div>
      </label>

      {fileQueue.length > 0 && (
        <div className="mt-7 rounded-[30px] border border-white/10 bg-[#07111F]/70 p-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <div className="text-2xl font-black">קבצים שממתינים לעיבוד</div>

              <div className="text-slate-400 text-sm mt-1">
                {fileQueue.length} קבצים ברשימה
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClearQueue}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-black hover:bg-white/[0.08] transition-all"
              >
                נקה רשימה
              </button>

              <button
                onClick={handleProcessAllFiles}
                disabled={status === "processing"}
                className="rounded-2xl bg-cyan-400 text-slate-950 px-5 py-3 font-black hover:bg-cyan-300 transition-all disabled:opacity-50"
              >
                {status === "processing" ? "מעבד קבצים..." : "עבד את כל הקבצים"}
              </button>

              <button
                onClick={handleClearAll}
                className="rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-300 px-5 py-3 font-black hover:bg-rose-400/20 transition-all"
              >
                נקה הכל
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {fileQueue.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-3xl">
                    📄
                  </div>

                  <div className="min-w-0">
                    <div className="font-black text-white truncate">
                      {item.fileName}
                    </div>

                    <div className="text-slate-400 text-sm mt-1">
                      {item.isBankFile
                        ? `${item.year} · ${item.source} · עו״ש מלא`
                        : `${getMonthLabel(item.month)} ${item.year} · ${
                            item.source
                          }`}
                    </div>

                    {item.status === "done" && (
                      <div className="text-emerald-300 text-sm mt-1 font-bold">
                        נקלטו {item.transactionCount} עסקאות
                      </div>
                    )}

                    {item.status === "error" && (
                      <div className="text-rose-300 text-sm mt-1 font-bold">
                        {item.error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm font-bold ${
                      item.status === "waiting"
                        ? "bg-slate-400/10 text-slate-300 border border-slate-400/20"
                        : item.status === "processing"
                        ? "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                        : item.status === "error"
                        ? "bg-rose-400/10 text-rose-300 border border-rose-400/20"
                        : "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                    }`}
                  >
                    {item.status === "waiting" && "ממתין"}
                    {item.status === "processing" && "מעבד"}
                    {item.status === "done" && "הושלם"}
                    {item.status === "error" && "שגיאה"}
                  </div>

                  {item.status === "waiting" && (
                    <button
                      onClick={() => handleRemoveQueuedFile(item.id)}
                      className="rounded-xl bg-white/5 px-3 py-2 text-slate-300 hover:bg-white/10"
                    >
                      הסר
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-300 font-bold">
          {error}
        </div>
      )}

      {importMessage && (
        <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300 font-bold">
          {importMessage}
        </div>
      )}

      {processedTransactions.length > 0 && (
        <div className="mt-7">
          <div className="text-2xl font-black mb-5">
            תצוגת עסקאות אחרונות שעובדו
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {processedTransactions.slice(0, 120).map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-[1fr_auto] gap-4 rounded-3xl border border-white/10 bg-[#07111F]/70 p-4"
              >
                <div>
                  <div className="font-black text-lg">
                    {tx.merchant || tx.description}
                  </div>

                  <div className="text-slate-400 text-sm mt-1">
                    {tx.date} · {tx.category} · {tx.issuer} ·{" "}
                    {getMonthLabel(tx.importMonth)} {tx.importYear} · confidence{" "}
                    {tx.confidence || 90}%
                  </div>
                </div>

                <div
                  className={`text-xl font-black ${
                    Number(tx.amount) < 0 ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}