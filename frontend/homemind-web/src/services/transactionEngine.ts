import * as XLSX from "xlsx";
import { ParsedFileResult, Transaction } from "../types/transactions";

const FALLBACK_CATEGORY_RULES: Record<string, string> = {
  "רמי לוי": "מזון וצריכה",
  "שופרסל": "מזון וצריכה",
  "ויקטורי": "מזון וצריכה",
  "אושר עד": "מזון וצריכה",
  "yellow": "תחבורה ודלק",
  "ילו": "תחבורה ודלק",
  "פז": "תחבורה ודלק",
  "דור אלון": "תחבורה ודלק",
  "wolt": "מסעדות ובתי קפה",
  "תן ביס": "מסעדות ובתי קפה",
  "מסעד": "מסעדות ובתי קפה",
  "openai": "מחשבים ותוכנה",
  "chatgpt": "מחשבים ותוכנה",
  "claude": "מחשבים ותוכנה",
  "anthropic": "מחשבים ותוכנה",
  "binance": "השקעות ופיננסים",
  "spotify": "מנויים ושירותים",
  "netflix": "מנויים ושירותים",
  "apple": "מנויים ושירותים",
  "google": "מנויים ושירותים",
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function parseAmount(value: unknown): number {
  const text = clean(value)
    .replace(/[₪,\s]/g, "")
    .replace(/[^\d.-]/g, "");

  const number = Number(text);

  return Number.isFinite(number) ? number : 0;
}

function excelDateToString(value: unknown): string {
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);

    if (!date) return "";

    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
      date.d
    ).padStart(2, "0")}`;
  }

  return clean(value);
}

function isValidDateLike(value: unknown): boolean {
  const text = clean(value);

  if (!text) return false;
  if (typeof value === "number") return true;

  return (
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(text) ||
    /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(text)
  );
}

function isSummaryOrInvalidMerchant(merchant: string): boolean {
  const text = merchant.trim();

  if (!text) return true;

  return (
    text.includes("סהכ") ||
    text.includes('סה"כ') ||
    text.includes("סך הכל") ||
    text.includes("סה״כ") ||
    (text.includes("סה") && text.includes("כל")) ||
    (text.includes("כרטיס") && text.includes("סה")) ||
    text.includes("תאריך") ||
    text.includes("שם בית העסק")
  );
}

function detectFallbackCategory(merchant: string): string {
  const normalizedMerchant = merchant.toLowerCase();

  for (const rule in FALLBACK_CATEGORY_RULES) {
    if (normalizedMerchant.includes(rule.toLowerCase())) {
      return FALLBACK_CATEGORY_RULES[rule];
    }
  }

  return "לא מסווג";
}

function normalizeOfficialCategory(category: string): string {
  const value = clean(category);

  if (!value) return "";

  if (value.includes("מזון") || value.includes("צריכה")) {
    return "מזון וצריכה";
  }

  if (value.includes("דלק") || value.includes("תחבורה")) {
    return "תחבורה ודלק";
  }

  if (value.includes("פארם") || value.includes("קוסמטיקה")) {
    return "פארם וקוסמטיקה";
  }

  if (value.includes("רפואה") || value.includes("מרקחת")) {
    return "רפואה ובתי מרקחת";
  }

  if (value.includes("חשמל") || value.includes("תקשורת")) {
    return "חשמל ותקשורת";
  }

  if (value.includes("מסעד") || value.includes("קפה")) {
    return "מסעדות ובתי קפה";
  }

  if (value.includes("פיננס") || value.includes("השקעות")) {
    return "השקעות ופיננסים";
  }

  return value;
}

function findHeaderRow(rows: unknown[][]): number {
  return rows.findIndex((row) => {
    const joined = row.map(clean).join(" ");

    return joined.includes("תאריך עסקה") && joined.includes("שם בית העסק");
  });
}

function getColumnIndex(headers: string[], possibleNames: string[]): number {
  return headers.findIndex((header) =>
    possibleNames.some((name) => header.includes(name))
  );
}

function buildTransactionId(params: {
  date: string;
  merchant: string;
  amount: number;
  issuer: string;
  rowIndex: number;
}): string {
  return [
    params.date,
    params.merchant,
    params.amount,
    params.issuer,
    params.rowIndex,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function normalizeMaxRow(params: {
  row: unknown[];
  index: number;
  dateIndex: number;
  merchantIndex: number;
  categoryIndex: number;
  amountIndex: number;
  issuer: string;
}): Transaction | null {
  const rawDate = params.row[params.dateIndex];
  const rawMerchant = params.row[params.merchantIndex];
  const rawAmount = params.row[params.amountIndex];
  const rawOfficialCategory =
    params.categoryIndex >= 0 ? params.row[params.categoryIndex] : "";

  const date = excelDateToString(rawDate);
  const merchant = clean(rawMerchant);
  const amount = parseAmount(rawAmount);

  if (!isValidDateLike(rawDate)) return null;
  if (isSummaryOrInvalidMerchant(merchant)) return null;
  if (!amount || Number.isNaN(amount)) return null;

  const officialCategory = normalizeOfficialCategory(clean(rawOfficialCategory));

  const category =
    officialCategory && officialCategory !== "לא מסווג"
      ? officialCategory
      : detectFallbackCategory(merchant);

  const confidence = officialCategory ? 100 : category !== "לא מסווג" ? 85 : 60;

  const id = buildTransactionId({
    date,
    merchant,
    amount,
    issuer: params.issuer,
    rowIndex: params.index,
  });

  return {
    id,
    date,
    merchant,
    amount,
    category,
    issuer: params.issuer,
    type: amount > 0 ? "expense" : "income",
    confidence,
  };
}

export async function parseTransactionFile(
  file: File
): Promise<ParsedFileResult> {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
  });

  const sheetName =
    workbook.SheetNames.find((name) => name.includes("עסקאות במועד החיוב")) ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  const headerRowIndex = findHeaderRow(rows);

  if (headerRowIndex === -1) {
    throw new Error("לא נמצאה שורת כותרות מתאימה בקובץ MAX");
  }

  const headers = rows[headerRowIndex].map(clean);

  const dateIndex = getColumnIndex(headers, ["תאריך עסקה"]);
  const merchantIndex = getColumnIndex(headers, ["שם בית העסק"]);
  const categoryIndex = getColumnIndex(headers, ["קטגוריה"]);
  const amountIndex = getColumnIndex(headers, ["סכום חיוב"]);

  if (dateIndex === -1 || merchantIndex === -1 || amountIndex === -1) {
    throw new Error("לא נמצאו עמודות חובה: תאריך עסקה / שם בית העסק / סכום חיוב");
  }

  const issuer = "MAX";
  const dataRows = rows.slice(headerRowIndex + 1);

  const parsedTransactions = dataRows
    .map((row, index) =>
      normalizeMaxRow({
        row,
        index,
        dateIndex,
        merchantIndex,
        categoryIndex,
        amountIndex,
        issuer,
      })
    )
    .filter(Boolean) as Transaction[];

  return {
    issuer,
    transactions: parsedTransactions,
  };
}

export function mockParseFile(): ParsedFileResult {
  return {
    issuer: "MAX",
    transactions: [],
  };
}