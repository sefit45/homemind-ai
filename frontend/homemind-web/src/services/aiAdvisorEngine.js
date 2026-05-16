import { loadFinancialHistory } from "./financialHistoryVault";

function formatCurrency(value) {
  return `₪${Math.round(Math.abs(value)).toLocaleString("he-IL")}`;
}

function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function getSortedEntries(map) {
  return Object.entries(map || {}).sort((a, b) => b[1] - a[1]);
}

function buildFollowUpSuggestions(intent) {
  switch (intent) {
    case "saving":
      return "\n\nאפשר גם לבדוק אילו בתי עסק הכי תרמו לבזבוז.";
    case "top_spending":
      return "\n\nרוצה שאפרק את זה לפי חודשים או לפי בתי עסק?";
    case "expensive":
      return "\n\nרוצה שאשווה גם לחודשים אחרים כדי לזהות מגמה?";
    case "category":
      return "\n\nאפשר גם להציג אילו בתי עסק הובילו את הקטגוריה הזאת.";
    case "merchant":
      return "\n\nאפשר גם לבדוק האם זה דפוס קבוע או הוצאה חד־פעמית.";
    case "change":
      return "\n\nרוצה שאנתח מה בדיוק גרם לשינוי בין החודשים?";
    case "anomaly":
      return "\n\nרוצה שאציג גם את העסקאות החריגות ביותר?";
    case "why":
      return "\n\nאפשר גם לבדוק אילו קטגוריות השפיעו הכי הרבה על החודש.";
    default:
      return "\n\nאפשר גם לבצע ניתוח חיסכון או השוואת חודשים.";
  }
}

function getFinancialContext() {
  const history = loadFinancialHistory();

  const months = history.map((month) => {
    const transactions = month.transactions || [];
    const expenses = transactions.filter((tx) => tx.type === "expense");
    const income = transactions.filter((tx) => tx.type === "income");

    const totalExpenses = expenses.reduce(
      (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
      0
    );

    const totalIncome = income.reduce(
      (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
      0
    );

    const categoryTotals = {};
    const merchantTotals = {};
    const categoryCounts = {};
    const merchantCounts = {};

    expenses.forEach((tx) => {
      const amount = Math.abs(Number(tx.amount || 0));
      const category = tx.category || "לא מסווג";
      const merchant = tx.merchant || "לא ידוע";

      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
      merchantTotals[merchant] = (merchantTotals[merchant] || 0) + amount;

      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      merchantCounts[merchant] = (merchantCounts[merchant] || 0) + 1;
    });

    const topCategory = getSortedEntries(categoryTotals)[0] || [];
    const topMerchant = getSortedEntries(merchantTotals)[0] || [];

    return {
      id: month.id,
      label: month.label,
      transactionsCount: transactions.length,
      expensesCount: expenses.length,
      incomeCount: income.length,
      totalExpenses,
      totalIncome,
      net: totalIncome - totalExpenses,
      topCategoryName: topCategory[0] || "אין נתונים",
      topCategoryAmount: topCategory[1] || 0,
      topMerchantName: topMerchant[0] || "אין נתונים",
      topMerchantAmount: topMerchant[1] || 0,
      categoryTotals,
      merchantTotals,
      categoryCounts,
      merchantCounts,
    };
  });

  return {
    months,
    latestMonth: months[months.length - 1],
    previousMonth: months[months.length - 2],
  };
}

function detectIntent(question) {
  const text = String(question || "").toLowerCase();

  if (
    text.includes("איך אפשר לחסוך") ||
    text.includes("לחסוך") ||
    text.includes("חיסכון") ||
    text.includes("להקטין")
  ) {
    return "saving";
  }

  if (
    text.includes("איפה אני מבזבז") ||
    text.includes("על מה אני מבזבז") ||
    text.includes("הכי הרבה")
  ) {
    return "top_spending";
  }

  if (
    text.includes("עסק הכי יקר") ||
    text.includes("בית עסק הכי יקר") ||
    text.includes("ספק הכי יקר") ||
    text.includes("בית העסק")
  ) {
    return "merchant";
  }

  if (
    text.includes("קטגוריה") ||
    text.includes("קטגוריות") ||
    text.includes("תחום")
  ) {
    return "category";
  }

  if (
    text.includes("חריג") ||
    text.includes("חריגה") ||
    text.includes("לא רגיל") ||
    text.includes("מוזר")
  ) {
    return "anomaly";
  }

  if (
    text.includes("מה השתנה") ||
    text.includes("שינוי") ||
    text.includes("לעומת") ||
    text.includes("בהשוואה")
  ) {
    return "change";
  }

  if (
    text.includes("הכי יקר") ||
    text.includes("חודש יקר") ||
    text.includes("יקר")
  ) {
    return "expensive";
  }

  if (text.includes("למה") || text.includes("מדוע")) {
    return "why";
  }

  return "summary";
}

function getMostExpensiveMonth(months) {
  return [...months].sort((a, b) => b.totalExpenses - a.totalExpenses)[0];
}

function getCheapestMonth(months) {
  return [...months].sort((a, b) => a.totalExpenses - b.totalExpenses)[0];
}

function getTopCategoryAcrossAllMonths(months) {
  const totals = {};

  months.forEach((month) => {
    Object.entries(month.categoryTotals).forEach(([category, amount]) => {
      totals[category] = (totals[category] || 0) + amount;
    });
  });

  const top = getSortedEntries(totals)[0];

  return top
    ? { name: top[0], amount: top[1] }
    : { name: "אין נתונים", amount: 0 };
}

function getTopMerchantAcrossAllMonths(months) {
  const totals = {};
  const counts = {};

  months.forEach((month) => {
    Object.entries(month.merchantTotals).forEach(([merchant, amount]) => {
      totals[merchant] = (totals[merchant] || 0) + amount;
      counts[merchant] =
        (counts[merchant] || 0) + (month.merchantCounts[merchant] || 0);
    });
  });

  const top = getSortedEntries(totals)[0];

  return top
    ? { name: top[0], amount: top[1], count: counts[top[0]] || 0 }
    : { name: "אין נתונים", amount: 0, count: 0 };
}

function getLargestCategoryChange(latest, previous) {
  if (!latest || !previous) return null;

  const changes = Object.entries(latest.categoryTotals)
    .map(([category, amount]) => {
      const previousAmount = previous.categoryTotals[category] || 0;
      const change = percentChange(amount, previousAmount);

      return {
        category,
        amount,
        previousAmount,
        change,
      };
    })
    .filter((item) => item.change !== null)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  return changes[0] || null;
}

function getPotentialSavings(latest) {
  const categories = getSortedEntries(latest.categoryTotals);
  const topCategory = categories[0];

  if (!topCategory) {
    return {
      amount: Math.round(latest.totalExpenses * 0.08),
      focus: "הוצאות כלליות",
    };
  }

  const [category, amount] = topCategory;

  return {
    amount: Math.round(amount * 0.12),
    focus: category,
  };
}

export async function askAIAdvisor(question) {
  const context = getFinancialContext();

  if (!context.months.length) {
    return "עדיין אין לי מספיק נתונים. העלה קודם כמה קובצי עסקאות חודשיים כדי שאוכל לנתח את ההתנהגות הפיננסית שלך.";
  }

  const { months, latestMonth: latest, previousMonth: previous } = context;
  const intent = detectIntent(question);

  if (intent === "top_spending") {
    const topCategory = getTopCategoryAcrossAllMonths(months);
    const topMerchant = getTopMerchantAcrossAllMonths(months);

    return (
      `המקום שבו אתה מבזבז הכי הרבה כרגע הוא קטגוריית ${topCategory.name}, עם ${formatCurrency(
        topCategory.amount
      )} על פני החודשים השמורים. בית העסק הבולט ביותר הוא ${
        topMerchant.name
      }, עם ${formatCurrency(topMerchant.amount)}.` +
      buildFollowUpSuggestions(intent)
    );
  }

  if (intent === "saving") {
    const saving = getPotentialSavings(latest);

    return (
      `לפי ${latest.label}, נקודת החיסכון הראשונה שכדאי לבדוק היא ${
        saving.focus
      }. חיסכון ריאלי וזהיר יכול להיות סביב ${formatCurrency(
        saving.amount
      )} בחודש, בלי לשנות דרמטית את אורח החיים.` +
      buildFollowUpSuggestions(intent)
    );
  }

  if (intent === "merchant") {
    const topMerchant = getTopMerchantAcrossAllMonths(months);

    return (
      `בית העסק המשמעותי ביותר שלך לאורך התקופה הוא ${
        topMerchant.name
      }, עם ${formatCurrency(topMerchant.amount)} ב־${
        topMerchant.count
      } עסקאות. כדאי לבדוק אם מדובר בהרגל קבוע, מנוי או הוצאה חד־פעמית גבוהה.` +
      buildFollowUpSuggestions(intent)
    );
  }

  if (intent === "category") {
    const topCategory = getTopCategoryAcrossAllMonths(months);

    return (
      `הקטגוריה המרכזית שלך לאורך התקופה היא ${
        topCategory.name
      }, עם סך הוצאות של ${formatCurrency(
        topCategory.amount
      )}. זו כנראה הקטגוריה הראשונה שכדאי לנתח לעומק.` +
      buildFollowUpSuggestions(intent)
    );
  }

  if (intent === "change" && previous) {
    const diff = latest.totalExpenses - previous.totalExpenses;
    const change = percentChange(latest.totalExpenses, previous.totalExpenses);
    const categoryChange = getLargestCategoryChange(latest, previous);

    let answer = `בין ${previous.label} ל־${latest.label}, ההוצאות ${
      diff > 0 ? "עלו" : "ירדו"
    } ב־${formatCurrency(diff)}${
      change !== null ? ` (${Math.abs(change).toFixed(1)}%)` : ""
    }.`;

    if (categoryChange) {
      answer += ` השינוי הבולט ביותר היה בקטגוריית ${
        categoryChange.category
      }, עם שינוי של ${Math.abs(categoryChange.change).toFixed(1)}%.`;
    }

    return answer + buildFollowUpSuggestions(intent);
  }

  if (intent === "anomaly") {
    const mostExpensive = getMostExpensiveMonth(months);
    const categoryChange = getLargestCategoryChange(latest, previous);

    if (categoryChange && Math.abs(categoryChange.change) > 40) {
      return (
        `החריגה המרכזית שאני מזהה היא בקטגוריית ${
          categoryChange.category
        }: ב־${latest.label} היא השתנתה ב־${Math.abs(
          categoryChange.change
        ).toFixed(1)}% לעומת ${previous.label}. בנוסף, ${
          mostExpensive.label
        } הוא החודש היקר ביותר עם ${formatCurrency(
          mostExpensive.totalExpenses
        )}.` + buildFollowUpSuggestions(intent)
      );
    }

    return (
      `החריגה המרכזית כרגע היא ש־${
        mostExpensive.label
      } הוא החודש היקר ביותר בתקופה, עם ${formatCurrency(
        mostExpensive.totalExpenses
      )}.` + buildFollowUpSuggestions(intent)
    );
  }

  if (intent === "expensive") {
    const mostExpensive = getMostExpensiveMonth(months);

    return (
      `החודש היקר ביותר כרגע הוא ${
        mostExpensive.label
      }, עם הוצאות של ${formatCurrency(
        mostExpensive.totalExpenses
      )}. הקטגוריה המרכזית שם הייתה ${
        mostExpensive.topCategoryName
      }, ובית העסק הבולט היה ${mostExpensive.topMerchantName}.` +
      buildFollowUpSuggestions(intent)
    );
  }

  if (intent === "why") {
    return (
      `הסיבה המרכזית לכך ש־${latest.label} נראה כפי שהוא היא קטגוריית ${
        latest.topCategoryName
      }, שהגיעה ל־${formatCurrency(
        latest.topCategoryAmount
      )}. בנוסף, בית העסק הבולט היה ${
        latest.topMerchantName
      } עם ${formatCurrency(
        latest.topMerchantAmount
      )}. זה כנראה מסביר את עיקר מבנה ההוצאות של החודש.` +
      buildFollowUpSuggestions(intent)
    );
  }

  const mostExpensive = getMostExpensiveMonth(months);
  const cheapest = getCheapestMonth(months);

  return (
    `סיכום מהיר: ב־${latest.label} נותחו ${
      latest.transactionsCount
    } עסקאות, סך ההוצאות היה ${formatCurrency(
      latest.totalExpenses
    )}, והקטגוריה המרכזית הייתה ${
      latest.topCategoryName
    }. החודש היקר ביותר הוא ${
      mostExpensive.label
    }, והחודש החסכוני ביותר הוא ${cheapest.label}.` +
    buildFollowUpSuggestions(intent)
  );
}