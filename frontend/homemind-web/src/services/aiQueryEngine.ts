import {
  getAllVaultTransactions,
  loadFinancialHistory,
} from "./financialHistoryVault";
import { Transaction } from "../types/transactions";

const MONTHS: Record<string, number> = {
  ינואר: 1,
  פברואר: 2,
  מרץ: 3,
  אפריל: 4,
  מאי: 5,
  יוני: 6,
  יולי: 7,
  אוגוסט: 8,
  ספטמבר: 9,
  אוקטובר: 10,
  נובמבר: 11,
  דצמבר: 12,
};

const QUERY_TO_OFFICIAL_CATEGORY: Record<string, string> = {
  אוכל: "מזון וצריכה",
  מזון: "מזון וצריכה",
  סופר: "מזון וצריכה",
  צריכה: "מזון וצריכה",
  קניות: "מזון וצריכה",

  מסעדות: "מסעדות ובתי קפה",
  מסעדה: "מסעדות ובתי קפה",
  קפה: "מסעדות ובתי קפה",
  וולט: "מסעדות ובתי קפה",
  wolt: "מסעדות ובתי קפה",

  דלק: "תחבורה ודלק",
  רכב: "תחבורה ודלק",
  תחבורה: "תחבורה ודלק",

  פארם: "פארם וקוסמטיקה",
  קוסמטיקה: "פארם וקוסמטיקה",

  רפואה: "רפואה ובתי מרקחת",
  תרופות: "רפואה ובתי מרקחת",
  ביתמרקחת: "רפואה ובתי מרקחת",
  "בית מרקחת": "רפואה ובתי מרקחת",

  חשמל: "חשמל ותקשורת",
  תקשורת: "חשמל ותקשורת",
  סלולר: "חשמל ותקשורת",

  השקעות: "השקעות ופיננסים",
  פיננסים: "השקעות ופיננסים",
  קריפטו: "השקעות ופיננסים",
  binance: "השקעות ופיננסים",
};

let lastDetectedCategory: string | null = null;
let lastDetectedMonth: number | null = null;

function normalize(text: unknown) {
  return String(text ?? "").toLowerCase().trim();
}

function normalizeCategory(category: unknown) {
  const value = normalize(category);

  if (value.includes("מזון") || value.includes("צריכה")) {
    return "מזון וצריכה";
  }

  if (value.includes("מסעד") || value.includes("קפה")) {
    return "מסעדות ובתי קפה";
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

  if (value.includes("פיננס") || value.includes("השקעות")) {
    return "השקעות ופיננסים";
  }

  return String(category ?? "").trim();
}

function detectMonth(question: string): number | null {
  const normalized = normalize(question);

  for (const [monthName, monthNumber] of Object.entries(MONTHS)) {
    if (normalized.includes(monthName)) {
      return monthNumber;
    }
  }

  return null;
}

function detectCategory(question: string): string | null {
  const normalized = normalize(question);

  for (const [alias, officialCategory] of Object.entries(
    QUERY_TO_OFFICIAL_CATEGORY
  )) {
    if (normalized.includes(alias.toLowerCase())) {
      return officialCategory;
    }
  }

  return null;
}

function getMonthName(month: number | null) {
  if (!month) return "כל החודשים";

  return (
    Object.entries(MONTHS).find(([, value]) => value === month)?.[0] ||
    "החודש שנבחר"
  );
}

function formatCurrency(value: number) {
  return `₪${Math.round(value).toLocaleString("he-IL")}`;
}

function filterByMonth(transactions: Transaction[], month: number | null) {
  if (!month) return transactions;

  return transactions.filter((tx: any) => {
    if (tx.importMonth) {
      return Number(tx.importMonth) === Number(month);
    }

    const date = String(tx.date || "");
    const parts = date.split(/[/-]/);

    if (parts.length < 2) return false;

    return Number(parts[1]) === Number(month);
  });
}

function filterByOfficialCategory(
  transactions: Transaction[],
  officialCategory: string | null
) {
  if (!officialCategory) return transactions;

  return transactions.filter((tx) => {
    return normalizeCategory(tx.category) === officialCategory;
  });
}

function getTopMerchants(transactions: Transaction[]) {
  return Object.entries(
    transactions.reduce<Record<string, number>>((acc, tx) => {
      const merchant = tx.merchant || "לא ידוע";

      acc[merchant] =
        (acc[merchant] || 0) + Math.abs(Number(tx.amount || 0));

      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function isFollowUpQuestion(question: string) {
  const normalized = normalize(question);

  return (
    normalized.includes("ומה") ||
    normalized.includes("ומה לגבי") ||
    normalized.includes("בזה") ||
    normalized.includes("שם") ||
    normalized.includes("אותו") ||
    normalized.includes("אותה")
  );
}

export function answerFinancialQuestion(question: string): string {
  const history = loadFinancialHistory();
  const allTransactions = getAllVaultTransactions();

  if (!history.length || !allTransactions.length) {
    return "עדיין אין מספיק נתונים. צריך לייבא קודם קובצי עסקאות חודשיים.";
  }

  let month = detectMonth(question);
  let officialCategory = detectCategory(question);

  if (isFollowUpQuestion(question)) {
    if (!month && lastDetectedMonth) {
      month = lastDetectedMonth;
    }

    if (!officialCategory && lastDetectedCategory) {
      officialCategory = lastDetectedCategory;
    }
  }

  if (month) {
    lastDetectedMonth = month;
  }

  if (officialCategory) {
    lastDetectedCategory = officialCategory;
  }

  let transactions = allTransactions.filter(
    (tx) => tx.type === "expense"
  );

  transactions = filterByMonth(transactions, month);
  transactions = filterByOfficialCategory(
    transactions,
    officialCategory
  );

  const count = transactions.length;

  if (count === 0) {
    return "לא מצאתי עסקאות שמתאימות לשאלה הזו לפי הנתונים ששמורים כרגע.";
  }

  const total = transactions.reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0
  );

  const monthText = getMonthName(month);
  const categoryText = officialCategory || "כל הקטגוריות";

  const merchantsText = getTopMerchants(transactions)
    .map(
      ([merchant, amount]) =>
        `${merchant}: ${formatCurrency(amount)}`
    )
    .join(" · ");

  return `מצאתי ${count} עסקאות בקטגוריית ${categoryText} עבור ${monthText}. סך ההוצאות: ${formatCurrency(
    total
  )}. בתי העסק המרכזיים: ${merchantsText}.`;
}