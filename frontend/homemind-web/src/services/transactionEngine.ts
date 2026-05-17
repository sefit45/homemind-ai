import * as XLSX from "xlsx";
import { ParsedFileResult, Transaction } from "../types/transactions";

const FALLBACK_CATEGORY_RULES: Record<string, string> = {
  "רמי לוי": "מזון וצריכה",
  שופרסל: "מזון וצריכה",
  ויקטורי: "מזון וצריכה",
  "אושר עד": "מזון וצריכה",
  "מחסני מזון": "מזון וצריכה",
  "סופר טל": "מזון וצריכה",
  פרשמרקט: "מזון וצריכה",
  באבלס: "מזון וצריכה",

  yellow: "תחבורה ודלק",
  ילו: "תחבורה ודלק",
  פז: "תחבורה ודלק",
  "דור אלון": "תחבורה ודלק",

  wolt: "מסעדות ובתי קפה",
  "תן ביס": "מסעדות ובתי קפה",
  מסעד: "מסעדות ובתי קפה",
  מאפה: "מסעדות ובתי קפה",
  מקדונלד: "מסעדות ובתי קפה",

  openai: "מחשבים וטכנולוגיה",
  chatgpt: "מחשבים וטכנולוגיה",
  claude: "מחשבים וטכנולוגיה",
  anthropic: "מחשבים וטכנולוגיה",
  ksp: "מחשבים וטכנולוגיה",
  stackblitz: "מחשבים וטכנולוגיה",
  bolt: "מחשבים וטכנולוגיה",
  shopify: "מחשבים וטכנולוגיה",
  "name-cheap": "מחשבים וטכנולוגיה",

  binance: "קריפטו והשקעות",
  swappedcom: "קריפטו והשקעות",
  kraken: "קריפטו והשקעות",

  spotify: "מנויים ושירותים",
  netflix: "מנויים ושירותים",
  apple: "מנויים ושירותים",
  google: "מנויים ושירותים",

  "סופר פארם": "רפואה ובתי מרקחת",
  "גוד פארם": "רפואה ובתי מרקחת",
  מכבידנט: "רפואה ובתי מרקחת",

  "דמי כרטיס": "עמלות והעברות",
  עמלה: "עמלות והעברות",

  קסטרו: "אופנה",
  "שטראוס מים": "חשמל ותקשורת",
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(value: unknown): string {
  return clean(value)
    .replace(/₪/g, "")
    .replace(/[״"]/g, "")
    .replace(/[׳']/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;

  const text = clean(value)
    .replace(/[₪,\s]/g, "")
    .replace(/[^\d.-]/g, "");

  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function excelDateToString(value: unknown): string {
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return "";

    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
      date.d
    ).padStart(2, "0")}`;
  }

  const text = clean(value);
  if (!text) return "";

  const parts = text.split(/[./-]/).map((part) => part.trim());

  if (parts.length === 3) {
    let [a, b, c] = parts;

    if (a.length === 4) {
      return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
    }

    if (c.length === 2) c = `20${c}`;

    return `${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }

  return text;
}

function isDateLike(value: unknown): boolean {
  if (typeof value === "number") return true;

  const text = clean(value);

  return (
    /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(text) ||
    /^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(text)
  );
}

function isSummaryRow(rowText: string): boolean {
  const text = normalizeText(rowText);

  return (
    !text ||
    text.includes("סהכ") ||
    text.includes("סךהכל") ||
    text.includes("סיכום") ||
    text.includes("לתשלום") ||
    text.includes("תאריךעסקה") ||
    text.includes("שםביתהעסק")
  );
}

function normalizeOfficialCategory(category: string): string {
  const value = clean(category);
  if (!value) return "";

  if (value.includes("מזון") || value.includes("צריכה")) return "מזון וצריכה";
  if (value.includes("דלק") || value.includes("תחבורה")) return "תחבורה ודלק";
  if (value.includes("פארם") || value.includes("קוסמטיקה")) return "פארם וקוסמטיקה";
  if (value.includes("רפואה") || value.includes("מרקחת")) return "רפואה ובתי מרקחת";
  if (value.includes("חשמל") || value.includes("תקשורת")) return "חשמל ותקשורת";
  if (value.includes("מסעד") || value.includes("קפה")) return "מסעדות ובתי קפה";
  if (value.includes("פיננס") || value.includes("השקעות")) return "קריפטו והשקעות";
  if (value.includes("קריפטו")) return "קריפטו והשקעות";

  return value;
}

function detectFallbackCategory(merchant: string): string {
  const normalizedMerchant = merchant.toLowerCase();

  for (const rule in FALLBACK_CATEGORY_RULES) {
    if (normalizedMerchant.includes(rule.toLowerCase())) {
      return FALLBACK_CATEGORY_RULES[rule];
    }
  }

  return "שונות";
}

function findHeaderRow(rows: unknown[][]): number {
  return rows.findIndex((row) => {
    const joined = row.map(normalizeText).join("|");

    return (
      (joined.includes("תאריךעסקה") || joined.includes("תאריךחיוב")) &&
      (joined.includes("שםביתהעסק") ||
        joined.includes("ביתהעסק") ||
        joined.includes("שםספק")) &&
      (joined.includes("סכוםחיוב") ||
        joined.includes("סכוםעסקה") ||
        joined.includes("סכום"))
    );
  });
}

function getColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(normalizeText);

  return normalizedHeaders.findIndex((header) =>
    possibleNames.some((name) => header.includes(normalizeText(name)))
  );
}

function pickAmount(row: unknown[], indexes: number[]): number {
  const parsedAmounts = indexes
    .filter((index) => index >= 0)
    .map((index) => parseAmount(row[index]))
    .filter((amount) => Number.isFinite(amount));

  const nonZeroAmount = parsedAmounts.find((amount) => amount !== 0);

  if (nonZeroAmount !== undefined) {
    return nonZeroAmount;
  }

  return parsedAmounts.length ? parsedAmounts[0] : NaN;
}

function buildTransactionId(params: {
  date: string;
  merchant: string;
  amount: number;
  issuer: string;
  sheetName: string;
  rowIndex: number;
}): string {
  return [
    params.issuer,
    params.sheetName,
    params.rowIndex,
    params.date,
    params.merchant,
    params.amount,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function normalizeMaxRow(params: {
  row: unknown[];
  rowIndex: number;
  sheetName: string;
  dateIndex: number;
  merchantIndex: number;
  categoryIndex: number;
  amountIndexes: number[];
  issuer: string;
}): Transaction | null {
  const rawDate = params.row[params.dateIndex];
  const rawMerchant = params.row[params.merchantIndex];
  const rawOfficialCategory =
    params.categoryIndex >= 0 ? params.row[params.categoryIndex] : "";

  const date = excelDateToString(rawDate);
  const merchant = clean(rawMerchant);
  const amount = pickAmount(params.row, params.amountIndexes);

  if (!isDateLike(rawDate)) return null;
  if (isSummaryRow(merchant)) return null;
  if (!Number.isFinite(amount)) return null;

  const originalCategory = clean(rawOfficialCategory);
  const officialCategory = normalizeOfficialCategory(originalCategory);
  const fallbackCategory = detectFallbackCategory(merchant);

  const category =
    officialCategory && officialCategory !== "לא מסווג"
      ? officialCategory
      : fallbackCategory;

  const confidence =
    officialCategory && category !== "שונות"
      ? 98
      : category !== "שונות"
      ? 85
      : 52;

  const mappingReason =
    officialCategory && category !== "שונות"
      ? "קטגוריה מקורית מקובץ MAX"
      : category !== "שונות"
      ? "זוהה לפי שם בית העסק"
      : "נדרש אימות משתמש";

  const id = buildTransactionId({
    date,
    merchant,
    amount,
    issuer: params.issuer,
    sheetName: params.sheetName,
    rowIndex: params.rowIndex,
  });

  return {
    id,
    date,
    merchant,
    description: merchant,
    amount,
    category,
    mappedCategory: category,
    issuer: params.issuer,
    type: amount >= 0 ? "expense" : "income",
    confidence,
    originalCategory,
    rawMerchant: merchant,
    rawAmount: clean(amount),
    sourceSheet: params.sheetName,
    sourceRow: params.rowIndex + 1,
    mappingReason,
    requiresReview: confidence < 80,
  } as Transaction;
}

export async function parseTransactionFile(
  file: File
): Promise<ParsedFileResult> {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
  });

  const issuer = "MAX";
  const allTransactions: Transaction[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];

    const headerRowIndex = findHeaderRow(rows);
    if (headerRowIndex === -1) continue;

    const headers = rows[headerRowIndex].map(clean);

    const dateIndex = getColumnIndex(headers, [
      "תאריך עסקה",
      "תאריך חיוב",
      "תאריך",
      "תאריך רכישה",
    ]);

    const merchantIndex = getColumnIndex(headers, [
      "שם בית העסק",
      "בית העסק",
      "שם ספק",
      "תיאור",
    ]);

    const categoryIndex = getColumnIndex(headers, [
      "קטגוריה",
      "ענף",
      "סוג עסקה",
      "סוג",
    ]);

    const amountIndexes = [
      getColumnIndex(headers, ["סכום עסקה"]),
      getColumnIndex(headers, ["סכום חיוב"]),
      getColumnIndex(headers, ['סכום חיוב ש"ח']),
      getColumnIndex(headers, ["חיוב בשח"]),
      getColumnIndex(headers, ['חיוב בש"ח']),
      getColumnIndex(headers, ["סכום"]),
      getColumnIndex(headers, ["amount"]),
    ].filter((index, position, array) => index >= 0 && array.indexOf(index) === position);

    if (dateIndex === -1 || merchantIndex === -1 || amountIndexes.length === 0) {
      continue;
    }

    const dataRows = rows.slice(headerRowIndex + 1);

    dataRows.forEach((row, index) => {
      const tx = normalizeMaxRow({
        row,
        rowIndex: headerRowIndex + 1 + index,
        sheetName,
        dateIndex,
        merchantIndex,
        categoryIndex,
        amountIndexes,
        issuer,
      });

      if (!tx) return;

      allTransactions.push(tx);
    });
  }

  if (!allTransactions.length) {
    throw new Error(
      "לא נמצאו עסקאות תקינות בקובץ MAX. יש לבדוק מבנה כותרות ועמודות."
    );
  }

  return {
    issuer,
    transactions: allTransactions,
    summary: {
      transactionCount: allTransactions.length,
      sheetsScanned: workbook.SheetNames.length,
      sheets: workbook.SheetNames,
    },
  } as ParsedFileResult;
}

export function mockParseFile(): ParsedFileResult {
  return {
    issuer: "MAX",
    transactions: [],
  };
}