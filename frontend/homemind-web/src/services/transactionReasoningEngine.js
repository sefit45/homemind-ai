function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

export function explainTransactionClassification(tx) {
  const text = normalizeText(
    `${tx.merchant || ""} ${tx.description || ""} ${tx.details || ""}`
  );

  const sourceLabel =
    tx.source === "bank_statement"
      ? "עו״ש בנקאי"
      : "כרטיס אשראי / מקור חיצוני";

  const reasons = [];
  const warnings = [];
  const confidence = Number(tx.aiConfidence ?? tx.confidence ?? 0);

  if (tx.userCorrectedType || tx.userCorrectedCategory) {
    reasons.push("העסקה תוקנה ידנית על ידי המשתמש ולכן התיקון מקבל עדיפות.");
  }

  if (tx.source === "bank_statement") {
    reasons.push("העסקה הגיעה ממקור עו״ש בנקאי.");
  } else {
    reasons.push("העסקה הגיעה ממקור אשראי / קובץ עסקאות.");
  }

  if (tx.type === "income") {
    reasons.push("העסקה מסווגת כהכנסה.");

    if (
      hasAny(text, [
        "משכורת",
        "שכר",
        "salary",
        "קצבה",
        "ביטוח לאומי",
        "זיכוי",
        "החזר",
      ])
    ) {
      reasons.push("זוהתה מילת מפתח שמתאימה להכנסה או זיכוי.");
    }
  }

  if (tx.type === "expense") {
    reasons.push("העסקה מסווגת כהוצאה.");

    if (tx.source !== "bank_statement") {
      reasons.push("בעסקאות אשראי, סכום חיובי עדיין יכול לייצג הוצאה.");
    }

    if (
      hasAny(text, [
        "שופרסל",
        "רמי לוי",
        "סופר",
        "yellow",
        "פז",
        "דלק",
        "wolt",
        "מסעדה",
        "קפה",
        "pharm",
        "פארם",
      ])
    ) {
      reasons.push("זוהה בית עסק או מילת מפתח צרכנית שמתאימה להוצאה.");
    }
  }

  if (tx.type === "transfer") {
    reasons.push("העסקה מסווגת כהעברה פנימית.");

    if (
      hasAny(text, [
        "העברה",
        "ביט",
        "bit",
        "paybox",
        "פייבוקס",
        "מקס",
        "ישראכרט",
        "כאל",
        "חיוב אשראי",
      ])
    ) {
      reasons.push("זוהתה מילת מפתח שמתאימה להעברה / סילוק אשראי / תנועה פנימית.");
    }
  }

  if (Number(tx.aiConfidence || 0) < 70) {
    warnings.push("רמת הביטחון נמוכה ולכן מומלץ לבדוק ידנית.");
  }

  if (tx.type === "income" && tx.source !== "bank_statement") {
    warnings.push("הכנסה ממקור אשראי היא חריגה יחסית ודורשת בדיקה.");
  }

  if (tx.type === "expense" && hasAny(text, ["משכורת", "salary", "קצבה"])) {
    warnings.push("נמצאה מילת הכנסה בתוך עסקה שסווגה כהוצאה.");
  }

  if (tx.type === "transfer" && hasAny(text, ["מסעדה", "סופר", "דלק", "פארם"])) {
    warnings.push("העסקה סווגה כהעברה אך נראית כמו צריכה רגילה.");
  }

  const category =
    tx.category || tx.mappedCategory || tx.aiCategory || "לא מסווג";
  const merchant = tx.merchant || tx.description || "לא ידוע";
  const typeLabel =
    tx.type === "income"
      ? "הכנסה"
      : tx.type === "transfer"
      ? "העברה"
      : "הוצאה";
  const summary = `העסקה סווגה כ${typeLabel} בקטגוריית ${category}, על בסיס מקור ${sourceLabel} וכללי התאמת מילים.`;
  const evidence = {
    source: sourceLabel,
    merchant,
    category,
    amount: Number(tx.amount || 0),
    type: tx.type || "expense",
  };

  return {
    summary,
    reasons,
    warnings,
    confidence,
    score: confidence,
    evidence,
  };
}
