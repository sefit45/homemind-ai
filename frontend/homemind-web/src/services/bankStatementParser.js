import * as XLSX from "xlsx";

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeHeader(value) {
  return cleanText(value)
    .replace(/\s+/g, "")
    .replace(/₪/g, "")
    .replace(/[^\u0590-\u05FFa-zA-Z0-9/]/g, "")
    .toLowerCase();
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;

  const cleaned = String(value)
    .replace(/₪/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/[^\d.-]/g, "");

  return Number(cleaned || 0);
}

function parseDate(value) {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";

    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
      parsed.d
    ).padStart(2, "0")}`;
  }

  const text = cleanText(value);
  const parts = text.split(/[./-]/);

  if (parts.length === 3) {
    let [day, month, year] = parts;

    if (year.length === 2) year = `20${year}`;

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  return text;
}

function detectCategory(description) {
  const text = String(description || "").toLowerCase();

  if (text.includes("מקס") || text.includes("max")) return "אשראי";
  if (text.includes("ישראכרט")) return "אשראי";
  if (text.includes("כאל")) return "אשראי";
  if (text.includes("ביט")) return "העברות";
  if (text.includes("משכורת")) return "הכנסה";
  if (text.includes("בטוח לאומי") || text.includes("ביטוח לאומי")) return "הכנסה";
  if (text.includes("בינאנס") || text.includes("binance")) return "קריפטו";
  if (text.includes("חשמל")) return "חשבונות";
  if (text.includes("ארנונה")) return "דיור";
  if (text.includes("ביטוח")) return "ביטוח";
  if (text.includes("סופר")) return "מזון";
  if (text.includes("רמי לוי")) return "מזון";
  if (text.includes("העברה")) return "העברות";
  if (text.includes("משיכת מזומן")) return "מזומן";
  if (text.includes("פיקדון")) return "חסכון / פיקדון";

  return "כללי";
}

function buildHeaderMap(headers) {
  const map = {};

  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    if (key) map[key] = index;
  });

  return map;
}

function getCell(row, headerMap, names) {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (headerMap[key] !== undefined) {
      return row[headerMap[key]];
    }
  }

  return "";
}

function extractMonthYear(date) {
  const parsed = new Date(date);

  if (!Number.isNaN(parsed.getTime())) {
    return {
      month: parsed.getMonth() + 1,
      year: parsed.getFullYear(),
    };
  }

  return {
    month: null,
    year: null,
  };
}

export async function parseBankStatement(file) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const headerRowIndex = rows.findIndex((row) => {
    const normalizedRow = row.map(normalizeHeader);

    return (
      normalizedRow.includes("תאריך") &&
      normalizedRow.includes("תיאורהתנועה") &&
      (
        normalizedRow.includes("זכות/חובה") ||
        normalizedRow.includes("חובה/זכות")
      )
    );
  });

  if (headerRowIndex === -1) {
    throw new Error("לא נמצאה שורת כותרות מתאימה בקובץ הבנק");
  }

  const headers = rows[headerRowIndex];
  const headerMap = buildHeaderMap(headers);
  const dataRows = rows.slice(headerRowIndex + 1);

  const transactions = dataRows
    .map((row, index) => {
      const date = parseDate(getCell(row, headerMap, ["תאריך"]));

      const valueDate = parseDate(getCell(row, headerMap, ["יום ערך"]));

      const description = cleanText(
        getCell(row, headerMap, ["תיאור התנועה", "תיאור", "פרטים"])
      );

      const amount = parseNumber(
        getCell(row, headerMap, [
          "זכות/חובה",
          "חובה/זכות",
          "₪ זכות/חובה",
          "₪ חובה/זכות",
          "סכום",
          "סכום פעולה",
        ])
      );

      const balance = parseNumber(
        getCell(row, headerMap, ["יתרה", "₪ יתרה", "יתרה לאחר פעולה"])
      );

      const reference = cleanText(
        getCell(row, headerMap, ["אסמכתה", "אסמכתא"])
      );

      const { month, year } = extractMonthYear(date);

      return {
        id: `bank_tx_${Date.now()}_${index}`,
        date,
        valueDate,
        merchant: description,
        description,
        amount,
        balance,
        reference,
        category: detectCategory(description),
        type: amount >= 0 ? "income" : "expense",
        confidence: 95,
        issuer: "בנק",
        source: "bank_statement",
        accountName: "עו״ש",
        importMonth: month,
        importYear: year,
      };
    })
    .filter((tx) => tx.date && tx.description && Number(tx.amount) !== 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalIncome = transactions
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = transactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return {
    issuer: "בנק",
    transactions,
    summary: {
      transactionCount: transactions.length,
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      sheetName,
    },
  };
}

export const parseBankStatementFile = parseBankStatement;