import { getLearnedCategoryForTransaction } from "./transactionLearningStore";

function textIncludes(tx, keywords = []) {
  const text = `${tx.merchant || ""} ${tx.description || ""}`.toLowerCase();

  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

export function calculateTransactionConfidence(tx) {
  const learnedCategory = getLearnedCategoryForTransaction(tx);

  if (learnedCategory) {
    return {
      score: 100,
      level: "high",
      reason: "נלמד מתיקון אישי שלך",
    };
  }

  if (
    textIncludes(tx, [
      "רמי לוי",
      "שופרסל",
      "סופר",
      "openai",
      "claude",
      "binance",
      "kraken",
      "ביטוח לאומי",
      "משכורת",
      "מקס",
      "ישראכרט",
      "כאל",
    ])
  ) {
    return {
      score: 95,
      level: "high",
      reason: "זוהה לפי בית עסק מוכר",
    };
  }

  if (
    textIncludes(tx, [
      "העברה",
      "הלוואה",
      "עמלה",
      "דמי כרטיס",
      "פיקדון",
      "ביטוח",
      "חשמל",
      "ארנונה",
    ])
  ) {
    return {
      score: 82,
      level: "medium",
      reason: "זוהה לפי מילת מפתח פיננסית",
    };
  }

  const category = tx.category || tx.mappedCategory || tx.aiCategory || "";

  if (!category || ["שונות", "כללי", "לא מסווג", "לא זוהה"].includes(category)) {
    return {
      score: 45,
      level: "low",
      reason: "המערכת לא בטוחה בקטגוריה",
    };
  }

  return {
    score: 70,
    level: "medium",
    reason: "קטגוריה קיימת אך לא אומתה",
  };
}

export function enrichTransactionWithConfidence(tx) {
  const confidence = calculateTransactionConfidence(tx);

  return {
    ...tx,
    aiConfidence: confidence.score,
    aiConfidenceLevel: confidence.level,
    aiConfidenceReason: confidence.reason,
    needsReview: confidence.score < 80,
  };
}