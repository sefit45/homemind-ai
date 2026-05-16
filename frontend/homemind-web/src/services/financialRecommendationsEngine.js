export function generateFinancialRecommendations(months) {
  if (!months || months.length === 0) {
    return [];
  }

  const recommendations = [];

  const sortedMonths = [...months].sort(
    (a, b) => Number(a.monthNumber) - Number(b.monthNumber)
  );

  const latestMonth = sortedMonths[sortedMonths.length - 1];

  if (!latestMonth) {
    return [];
  }

  const totalExpenses = latestMonth.totalExpenses || 0;

  /*
    =========================
    FOOD CATEGORY
    =========================
  */

  const foodCategory = latestMonth.categories?.find(
    (c) =>
      c.category?.includes("מזון") ||
      c.category?.includes("אוכל")
  );

  if (foodCategory) {
    const foodPercent =
      (foodCategory.total / totalExpenses) * 100;

    if (foodPercent > 35) {
      recommendations.push({
        type: "warning",
        title: "הוצאות אוכל גבוהות",
        message: `קטגוריית המזון מהווה ${foodPercent.toFixed(
          1
        )}% מכלל ההוצאות החודש.`,
        potentialSaving: Math.round(foodCategory.total * 0.15),
      });
    }
  }

  /*
    =========================
    ONLINE SHOPPING
    =========================
  */

  const shoppingCategory = latestMonth.categories?.find(
    (c) =>
      c.category?.includes("קניות") ||
      c.category?.includes("אונליין")
  );

  if (shoppingCategory && shoppingCategory.total > 1500) {
    recommendations.push({
      type: "shopping",
      title: "קניות אונליין חריגות",
      message:
        "זוהתה הוצאה גבוהה יחסית על קניות אונליין.",
      potentialSaving: Math.round(
        shoppingCategory.total * 0.2
      ),
    });
  }

  /*
    =========================
    RECURRING PAYMENTS
    =========================
  */

  const recurringMerchants = latestMonth.merchants?.filter(
    (merchant) => merchant.transactions >= 3
  );

  recurringMerchants?.forEach((merchant) => {
    recommendations.push({
      type: "subscription",
      title: "חיוב חוזר זוהה",
      message: `${merchant.name} חויב ${merchant.transactions} פעמים החודש.`,
      potentialSaving: Math.round(merchant.total * 0.5),
    });
  });

  /*
    =========================
    HIGH MONTH TREND
    =========================
  */

  if (sortedMonths.length >= 2) {
    const prevMonth =
      sortedMonths[sortedMonths.length - 2];

    if (prevMonth?.totalExpenses) {
      const growth =
        ((latestMonth.totalExpenses -
          prevMonth.totalExpenses) /
          prevMonth.totalExpenses) *
        100;

      if (growth > 20) {
        recommendations.push({
          type: "trend",
          title: "עלייה חדה בהוצאות",
          message: `הוצאות החודש עלו ב-${growth.toFixed(
            1
          )}% לעומת החודש הקודם.`,
          potentialSaving: Math.round(
            latestMonth.totalExpenses * 0.1
          ),
        });
      }
    }
  }

  /*
    =========================
    GENERAL SAVING
    =========================
  */

  const possibleSaving = Math.round(
    totalExpenses * 0.08
  );

  recommendations.push({
    type: "saving",
    title: "פוטנציאל חיסכון חודשי",
    message:
      "AI מזהה אפשרות להתייעלות פיננסית כללית.",
    potentialSaving: possibleSaving,
  });

  return recommendations;
}