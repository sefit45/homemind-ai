import { calculateUnifiedFinancialSummary } from "./unifiedFinancialEngine";
import {
  calculateUnifiedCashflow,
  detectRecurringTransactions,
  getConfidenceSummary,
} from "./unifiedTransactionsEngine";
import { calculateUserAssetsSummary } from "./userAssetsStore";
import { generateDynamicInsights } from "./dynamicInsightsEngine";
import { generateHistoricalMemories } from "./historicalMemoryEngine";
import { generateDailyBriefing } from "./dailyBriefingEngine";

function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(value) {
  return `₪${Math.round(safeNumber(value)).toLocaleString("he-IL")}`;
}

function getAssetTotals(assetsSummary) {
  const assets = assetsSummary?.assets || [];
  const positiveAssets = assets.filter((asset) => asset.type !== "liability");

  const totalAssets = positiveAssets.reduce(
    (sum, asset) => sum + Math.max(safeNumber(asset.estimatedValue), 0),
    0
  );

  const assetDebt = positiveAssets.reduce(
    (sum, asset) => sum + Math.max(safeNumber(asset.debt), 0),
    0
  );

  const liabilityDebt = assets
    .filter((asset) => asset.type === "liability")
    .reduce((sum, asset) => {
      const estimatedDebt = Math.abs(safeNumber(asset.estimatedValue));
      const explicitDebt = Math.abs(safeNumber(asset.debt));
      return sum + Math.max(estimatedDebt, explicitDebt);
    }, 0);

  const monthlyIncomeFromAssets = positiveAssets.reduce(
    (sum, asset) => sum + safeNumber(asset.monthlyIncome),
    0
  );

  const totalDebt = assetDebt + liabilityDebt;

  return {
    assets,
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
    monthlyIncomeFromAssets,
  };
}

function calculateHealthScore({
  netWorth,
  totalAssets,
  totalDebt,
  trueNetCashflow,
  trueIncome,
  trueExpenses,
  confidence,
}) {
  let score = 55;

  if (netWorth > 0) score += 15;
  if (totalAssets > 0) score += 8;
  if (totalDebt === 0) score += 8;

  if (totalDebt > 0 && totalAssets > 0) {
    const debtRatio = totalDebt / totalAssets;
    if (debtRatio < 0.25) score += 8;
    if (debtRatio > 0.55) score -= 12;
  }

  if (trueNetCashflow > 0) score += 12;
  if (trueNetCashflow < 0) score -= 15;

  if (trueIncome > 0 && trueExpenses > 0) {
    const expenseRatio = trueExpenses / trueIncome;
    if (expenseRatio < 0.75) score += 8;
    if (expenseRatio > 1) score -= 12;
  }

  if (confidence >= 80) score += 5;
  if (confidence > 0 && confidence < 55) score -= 8;

  return clamp(Math.round(score));
}

function getRiskLevel(score, trueNetCashflow) {
  if (score >= 78 && trueNetCashflow >= 0) {
    return {
      level: "נמוכה",
      tone: "emerald",
      label: "יציב",
      description:
        "התמונה הפיננסית הכללית נראית יציבה, עם בסיס נכסים חזק ותזרים שאינו מצביע כרגע על לחץ חריג.",
    };
  }

  if (score >= 58) {
    return {
      level: "בינונית",
      tone: "amber",
      label: "דורש מעקב",
      description:
        "המצב הכללי סביר, אך יש נקודות שדורשות בקרה: תזרים, סיווג עסקאות, חיובים חוזרים או התחייבויות.",
    };
  }

  return {
    level: "גבוהה",
    tone: "rose",
    label: "לטיפול",
    description:
      "המערכת מזהה סימנים ללחץ פיננסי או איכות נתונים שדורשת בדיקה לפני קבלת החלטות.",
  };
}

function buildStressSignals(summary, confidenceSummary, recurringTransactions) {
  const signals = [];

  if (summary.trueNetCashflow < 0) {
    signals.push({
      title: "תזרים שלילי",
      description: `התזרים המאוחד עומד על ${formatCurrency(
        summary.trueNetCashflow
      )}. זה סימן שצריך לבדוק הוצאות, חיובים חוזרים והכנסות צפויות.`,
      severity: "high",
    });
  }

  if (summary.creditCardSettlements > 0) {
    signals.push({
      title: "זוהו חיובי אשראי בעו״ש",
      description: `המערכת זיהתה ${formatCurrency(
        summary.creditCardSettlements
      )} כחיובי אשראי שסומנו כדי למנוע ספירה כפולה.`,
      severity: "medium",
    });
  }

  if (confidenceSummary?.average && confidenceSummary.average < 65) {
    signals.push({
      title: "רמת ביטחון מיפוי נמוכה",
      description:
        "חלק מהעסקאות דורשות אישור או תיקון קטגוריה כדי לשפר את איכות המוח הפיננסי.",
      severity: "medium",
    });
  }

  if ((recurringTransactions || []).length >= 5) {
    signals.push({
      title: "ריבוי חיובים חוזרים",
      description: `זוהו ${recurringTransactions.length} חיובים חוזרים. מומלץ לבדוק אילו מהם עדיין נחוצים.`,
      severity: "low",
    });
  }

  if (signals.length === 0) {
    signals.push({
      title: "אין סימן לחץ חריג כרגע",
      description:
        "לא זוהתה בעיית תזרים קריטית על בסיס הנתונים הקיימים. עדיין מומלץ להמשיך לטייב את מיפוי העסקאות.",
      severity: "low",
    });
  }

  return signals;
}

function buildOpportunities(summary, assetTotals, recurringTransactions) {
  const opportunities = [];

  if (assetTotals.monthlyIncomeFromAssets > 0) {
    opportunities.push({
      title: "הכנסה מנכסים קיימים",
      description: `הנכסים שלך מייצרים כ־${formatCurrency(
        assetTotals.monthlyIncomeFromAssets
      )} בחודש. זה בסיס טוב לבניית Wealth Engine.`,
      impact: "high",
    });
  }

  if (summary.trueIncome > summary.trueExpenses && summary.trueIncome > 0) {
    opportunities.push({
      title: "פוטנציאל הקצאה לחיסכון / השקעות",
      description: `נראה שיש עודף תזרימי של ${formatCurrency(
        summary.trueNetCashflow
      )} שניתן לנתב בצורה חכמה יותר.`,
      impact: "high",
    });
  }

  if ((recurringTransactions || []).length > 0) {
    opportunities.push({
      title: "ניקוי מנויים וחיובים חוזרים",
      description:
        "בדיקה אחת של חיובים חוזרים יכולה לחשוף דליפות קטנות שמצטברות לסכומים משמעותיים לאורך שנה.",
      impact: "medium",
    });
  }

  if (opportunities.length === 0) {
    opportunities.push({
      title: "טייב נתונים לפני המלצות עמוקות",
      description:
        "ככל שיוזנו יותר עסקאות ונכסים, המערכת תוכל לזהות הזדמנויות חיסכון והשקעה מדויקות יותר.",
      impact: "medium",
    });
  }

  return opportunities;
}

function buildUrgentActions(summary, confidenceSummary, stressSignals) {
  const actions = [];

  if (summary.trueNetCashflow < 0) {
    actions.push("בדוק את 10 ההוצאות הגדולות האחרונות והשווה אותן להכנסות החודש.");
  }

  if (summary.creditCardSettlements > 0) {
    actions.push("ודא שחיובי אשראי מהעו״ש לא נספרים פעמיים כהוצאה אמיתית.");
  }

  if (confidenceSummary?.needsReview > 0) {
    actions.push(`אשר או תקן ${confidenceSummary.needsReview} עסקאות עם ביטחון AI נמוך.`);
  }

  if (stressSignals.some((signal) => signal.severity === "high")) {
    actions.push("צור תקרת הוצאה שבועית זמנית עד שהמגמה מתייצבת.");
  }

  if (actions.length === 0) {
    actions.push(
      "המשך להעלות נתוני עו״ש ואשראי כדי לחזק את רמת הדיוק של המוח הפיננסי."
    );
  }

  return actions;
}

function buildBehavioralProfile(summary, recurringTransactions, memories) {
  const expenseRatio =
    summary.trueIncome > 0 ? summary.trueExpenses / summary.trueIncome : 0;

  const profile = [];

  if (expenseRatio > 1) {
    profile.push("דפוס הוצאות גבוה מהכנסות — דורש בקרה מיידית.");
  } else if (expenseRatio > 0.75) {
    profile.push("דפוס הוצאות גבוה יחסית להכנסה — יש מקום לאופטימיזציה.");
  } else if (summary.trueIncome > 0) {
    profile.push("דפוס תזרים מאוזן יחסית — בסיס טוב לתכנון קדימה.");
  }

  if ((recurringTransactions || []).length > 0) {
    profile.push("קיימת שכבת התחייבויות חוזרות שצריך לנהל כמו תקציב קבוע.");
  }

  if ((memories || []).length > 0) {
    profile.push(
      "קיימת היסטוריה פיננסית שמאפשרת להתחיל לזהות שינויי התנהגות לאורך זמן."
    );
  }

  if (profile.length === 0) {
    profile.push("עדיין חסרים מספיק נתונים כדי לבנות פרופיל התנהגותי עמוק.");
  }

  return profile;
}

export function generateUnifiedFinancialBrain() {
  const unifiedSummary = calculateUnifiedFinancialSummary();
  const cashflowSummary = calculateUnifiedCashflow();
  const assetsSummary = calculateUserAssetsSummary();
  const assetTotals = getAssetTotals(assetsSummary);
  const recurringTransactions = detectRecurringTransactions();
  const confidenceSummary = getConfidenceSummary();
  const dynamicInsights = generateDynamicInsights();
  const historicalMemories = generateHistoricalMemories();
  const dailyBriefing = generateDailyBriefing();

  const averageConfidence = safeNumber(confidenceSummary?.average);

  const healthScore = calculateHealthScore({
    netWorth: assetTotals.netWorth,
    totalAssets: assetTotals.totalAssets,
    totalDebt: assetTotals.totalDebt,
    trueNetCashflow: unifiedSummary.trueNetCashflow,
    trueIncome: unifiedSummary.trueIncome,
    trueExpenses: unifiedSummary.trueExpenses,
    confidence: averageConfidence,
  });

  const risk = getRiskLevel(healthScore, unifiedSummary.trueNetCashflow);
  const stressSignals = buildStressSignals(
    unifiedSummary,
    confidenceSummary,
    recurringTransactions
  );
  const opportunities = buildOpportunities(
    unifiedSummary,
    assetTotals,
    recurringTransactions
  );
  const urgentActions = buildUrgentActions(
    unifiedSummary,
    confidenceSummary,
    stressSignals
  );
  const behavioralProfile = buildBehavioralProfile(
    unifiedSummary,
    recurringTransactions,
    historicalMemories
  );

  return {
    generatedAt: new Date().toISOString(),
    financialHealthScore: healthScore,
    risk,
    executiveSummary: {
      title: `המצב הפיננסי הכללי: ${risk.label}`,
      description: risk.description,
      mainInsight:
        unifiedSummary.transactionsCount > 0
          ? `נותחו ${unifiedSummary.transactionsCount.toLocaleString(
              "he-IL"
            )} תנועות, עם תזרים מאוחד של ${formatCurrency(
              unifiedSummary.trueNetCashflow
            )} ושווי נקי מוערך של ${formatCurrency(assetTotals.netWorth)}.`
          : `עדיין חסרות עסקאות כדי לייצר תמונת תזרים מלאה. שווי הנכסים המוערך כרגע הוא ${formatCurrency(
              assetTotals.netWorth
            )}.`,
    },
    metrics: {
      netWorth: assetTotals.netWorth,
      totalAssets: assetTotals.totalAssets,
      totalDebt: assetTotals.totalDebt,
      trueIncome: unifiedSummary.trueIncome,
      trueExpenses: unifiedSummary.trueExpenses,
      trueNetCashflow: unifiedSummary.trueNetCashflow,
      monthlyIncomeFromAssets: assetTotals.monthlyIncomeFromAssets,
      transactionsCount: unifiedSummary.transactionsCount,
      averageConfidence,
      recurringCount: recurringTransactions.length,
    },
    stressSignals,
    opportunities,
    urgentActions,
    behavioralProfile,
    supportingSignals: {
      cashflowSummary,
      dynamicInsights: Array.isArray(dynamicInsights)
        ? dynamicInsights.slice(0, 5)
        : [],
      historicalMemories: Array.isArray(historicalMemories)
        ? historicalMemories.slice(0, 5)
        : [],
      dailyBriefing,
    },
  };
}