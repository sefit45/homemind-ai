import { getAllUnifiedTransactions } from "./unifiedTransactionsEngine";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(Number(value || 0))).toLocaleString("he-IL")}`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getMonthNumberFromHebrew(text) {
  const months = {
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

  return Object.entries(months).find(([name]) => text.includes(name))?.[1] || null;
}

function filterByMonth(transactions, question) {
  const text = normalizeText(question);
  const month = getMonthNumberFromHebrew(text);

  if (!month) return transactions;

  return transactions.filter((tx) => {
    const date = new Date(tx.date);
    return !Number.isNaN(date.getTime()) && date.getMonth() + 1 === month;
  });
}

function sumTransactions(transactions, predicate) {
  return transactions
    .filter(predicate)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
}

function groupByCategory(transactions) {
  const map = {};

  transactions.forEach((tx) => {
    const category = tx.category || tx.mappedCategory || "שונות";
    const amount = Math.abs(Number(tx.amount || 0));

    if (!map[category]) {
      map[category] = {
        category,
        total: 0,
        count: 0,
      };
    }

    map[category].total += amount;
    map[category].count += 1;
  });

  return Object.values(map).sort((a, b) => b.total - a.total);
}

function groupByMerchant(transactions) {
  const map = {};

  transactions.forEach((tx) => {
    const merchant = tx.merchant || tx.description || "לא ידוע";
    const amount = Math.abs(Number(tx.amount || 0));

    if (!map[merchant]) {
      map[merchant] = {
        merchant,
        total: 0,
        count: 0,
      };
    }

    map[merchant].total += amount;
    map[merchant].count += 1;
  });

  return Object.values(map).sort((a, b) => b.total - a.total);
}

function buildList(items, type = "category") {
  return items
    .slice(0, 8)
    .map((item) => {
      const name = type === "merchant" ? item.merchant : item.category;
      return `- ${name}: ${formatCurrency(item.total)} (${item.count} תנועות)`;
    })
    .join("\n");
}

export function askFinancialAi(question) {
  const text = normalizeText(question);
  const allTransactions = getAllUnifiedTransactions();
  const transactions = filterByMonth(allTransactions, question);

  const expenses = transactions.filter((tx) => Number(tx.amount || 0) < 0);
  const income = transactions.filter((tx) => Number(tx.amount || 0) > 0);

  const totalExpenses = sumTransactions(transactions, (tx) => Number(tx.amount || 0) < 0);
  const totalIncome = sumTransactions(transactions, (tx) => Number(tx.amount || 0) > 0);
  const net = totalIncome - totalExpenses;

  if (!transactions.length) {
    return "לא מצאתי תנועות מתאימות לשאלה שלך. ייתכן שאין נתונים לחודש שביקשת.";
  }

  if (text.includes("הכנסות") || text.includes("נכנס") || text.includes("הכנסה")) {
    return `מצאתי ${income.length} תנועות הכנסה בסך כולל של ${formatCurrency(totalIncome)}.`;
  }

  if (text.includes("הוצאות") || text.includes("הוצאתי") || text.includes("יצא")) {
    return `מצאתי ${expenses.length} תנועות הוצאה בסך כולל של ${formatCurrency(totalExpenses)}.`;
  }

  if (text.includes("נטו") || text.includes("תזרים")) {
    return `התזרים נטו הוא ${net >= 0 ? "+" : "-"}${formatCurrency(net)}.\n\nהכנסות: ${formatCurrency(totalIncome)}\nהוצאות: ${formatCurrency(totalExpenses)}`;
  }

  if (text.includes("קטגור")) {
    const categories = groupByCategory(expenses);

    return `פירוט ההוצאות לפי קטגוריות:\n\n${buildList(categories, "category")}`;
  }

  if (text.includes("בתי עסק") || text.includes("ספקים") || text.includes("עסק")) {
    const merchants = groupByMerchant(expenses);

    return `בתי העסק המרכזיים לפי הוצאות:\n\n${buildList(merchants, "merchant")}`;
  }

  if (text.includes("הכי הרבה") || text.includes("הוצאה הכי גדולה")) {
    const biggest = [...expenses].sort(
      (a, b) => Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0))
    )[0];

    return `ההוצאה הכי גדולה שמצאתי היא:\n\n- ${biggest.merchant || biggest.description}\n- תאריך: ${biggest.date}\n- סכום: ${formatCurrency(biggest.amount)}\n- קטגוריה: ${biggest.category || "שונות"}`;
  }

  if (text.includes("קריפטו")) {
    const crypto = expenses.filter((tx) =>
      normalizeText(`${tx.category} ${tx.merchant} ${tx.description}`).includes("קריפטו")
    );

    const total = crypto.reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

    return `מצאתי ${crypto.length} תנועות שקשורות לקריפטו בסך ${formatCurrency(total)}.`;
  }

  return `מצאתי ${transactions.length} תנועות רלוונטיות.\n\nהכנסות: ${formatCurrency(totalIncome)}\nהוצאות: ${formatCurrency(totalExpenses)}\nתזרים נטו: ${net >= 0 ? "+" : "-"}${formatCurrency(net)}\n\nאפשר לשאול למשל:\n- כמה הוצאתי במאי?\n- מה ההוצאה הכי גדולה?\n- כמה נכנס לי ביוני?\n- מה בתי העסק המרכזיים?\n- פירוט לפי קטגוריות`;
}