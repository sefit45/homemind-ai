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

    if (day.length === 4) {
      return `${day}-${String(month).padStart(2, "0")}-${String(year).padStart(
        2,
        "0"
      )}`;
    }

    if (year.length === 2) {
      year = `20${year}`;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  const native = new Date(text);
  if (!Number.isNaN(native.getTime())) {
    return native.toISOString().slice(0, 10);
  }

  return "";
}

function extractMonthYear(date) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      importMonth: null,
      importYear: null,
    };
  }

  return {
    importMonth: parsedDate.getMonth() + 1,
    importYear: parsedDate.getFullYear(),
  };
}

function isFutureDate(date) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return parsedDate > today;
}

function buildHeaderMap(headers) {
  const map = {};

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);

    if (normalized) {
      map[normalized] = index;
    }
  });

  return map;
}

function getCell(row, headerMap, names) {
  for (const name of names) {
    const normalized = normalizeHeader(name);

    if (headerMap[normalized] !== undefined) {
      return row[headerMap[normalized]];
    }
  }

  return "";
}

function detectCategory(description) {
  const text = String(description || "").toLowerCase();

  if (text.includes("מקס") || text.includes("max")) return "אשראי";
  if (text.includes("ישראכרט")) return "אשראי";
  if (text.includes("כאל")) return "אשראי";
  if (text.includes("ביט")) return "העברות";
  if (text.includes("משכורת")) return "הכנסה";
  if (text.includes("בטוח לאומי") || text.includes("ביטוח לאומי")) {
    return "הכנסה";
  }
  if (text.includes("בינאנס") || text.includes("binance")) return "קריפטו";
  if (text.includes("חשמל")) return "חשבונות";
  if (text.includes("ארנונה")) return "דיור";
  if (text.includes("ביטוח")) return "ביטוח";
  if (text.includes("הלוואה")) return "הלוואות";
  if (text.includes("פיקדון")) return "חסכון";
  if (text.includes("העברה")) return "העברות";
  if (text.includes("משיכת מזומן")) return "מזומן";
  if (text.includes("סופר")) return "מזון";
  if (text.includes("רמי לוי")) return "מזון";

  return "כללי";
}

function isSummaryOrMetadataRow(description) {
  const text = String(description || "")
    .replace(/\s+/g, "")
    .toLowerCase();

  if (!text) return true;

  return (
    text.includes("יתרה") ||
    text.includes("סהכ") ||
    text.includes("סךהכל") ||
    text.includes("סיכום") ||
    text.includes("לתאריך") ||
    text.includes("תנועותבחשבון") ||
    text.includes("שםחשבון") ||
    text.includes("מספרחשבון")
  );
}

function normalizeBankTransaction(tx) {
  const description = cleanText(tx.description);
  const category = detectCategory(description);

  const isCreditCardSettlement =
    category === "אשראי" ||
    description.includes("מקס") ||
    description.toLowerCase().includes("max") ||
    description.includes("ישראכרט") ||
    description.includes("כאל");

  return {
    ...tx,
    merchant: description,
    description,
    category,
    mappedCategory: category,
    source: "bank_statement",
    issuer: "בנק",
    accountName: "עו״ש",
    confidence: 95,
    internalTransfer: isCreditCardSettlement,
    excludeFromExpenses: isCreditCardSettlement,
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
    raw: true,
  });

  const headerRowIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);

    return (
      normalized.includes("תאריך") &&
      (normalized.includes("תיאורהתנועה") ||
        normalized.includes("תיאור") ||
        normalized.includes("פרטים")) &&
      (normalized.includes("זכות/חובה") ||
        normalized.includes("חובה/זכות") ||
        normalized.includes("סכום") ||
        normalized.includes("סכוםפעולה"))
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

      const valueDate = parseDate(
        getCell(row, headerMap, ["יום ערך", "תאריך ערך"])
      );

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

      const { importMonth, importYear } = extractMonthYear(date);

      return normalizeBankTransaction({
        id: `bank_tx_${sheetName}_${headerRowIndex + index + 1}_${date}_${amount}`,
        date,
        valueDate,
        merchant: description,
        description,
        amount,
        balance,
        reference,
        type: amount >= 0 ? "income" : "expense",
        importMonth,
        importYear,
        importFileName: file.name,
        sourceSheet: sheetName,
        sourceRow: headerRowIndex + index + 2,
      });
    })
    .filter((tx) => tx.date)
    .filter((tx) => !isFutureDate(tx.date))
    .filter((tx) => tx.importMonth && tx.importYear)
    .filter((tx) => tx.description)
    .filter((tx) => !isSummaryOrMetadataRow(tx.description))
    .filter((tx) => Number(tx.amount) !== 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalIncome = transactions
    .filter((tx) => Number(tx.amount || 0) > 0)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const totalExpenses = transactions
    .filter((tx) => Number(tx.amount || 0) < 0)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  return {
    issuer: "בנק",
    transactions,
    transactionsCount: transactions.length,
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