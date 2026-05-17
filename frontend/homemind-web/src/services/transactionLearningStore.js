const STORAGE_KEY = "homemind_transaction_learning_v1";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeMerchant(value) {
  return normalizeText(value);
}

export function loadTransactionLearning() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadCategoryLearning() {
  return loadTransactionLearning();
}

export function saveTransactionLearning(params = {}) {
  const merchant = normalizeMerchant(params.merchant);

  if (!merchant) {
    return loadTransactionLearning();
  }

  const learning = loadTransactionLearning();

  learning[merchant] = {
    merchant,
    category: params.category || learning[merchant]?.category || "",
    type: params.type || learning[merchant]?.type || "",
    confirmed: Boolean(params.confirmed),
    rejected: Boolean(params.rejected),
    confidence: params.confidence ?? 100,
    note: params.note || "",
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(learning));

  window.dispatchEvent(new Event("homemind:transactions-updated"));

  return learning;
}

export function saveCategoryLearning(merchant, category) {
  return saveTransactionLearning({
    merchant,
    category,
    confidence: 100,
    confirmed: true,
    note: "category_correction",
  });
}

export function saveTypeLearning(merchant, type) {
  return saveTransactionLearning({
    merchant,
    type,
    confidence: 100,
    confirmed: true,
    note: "type_correction",
  });
}

export function approveTransactionLearning(transaction) {
  return saveTransactionLearning({
    merchant: transaction.merchant || transaction.description,
    category: transaction.category || transaction.mappedCategory || "",
    type: transaction.type || "",
    confidence: 100,
    confirmed: true,
    rejected: false,
    note: "ai_approved_by_user",
  });
}

export function rejectTransactionLearning(transaction) {
  return saveTransactionLearning({
    merchant: transaction.merchant || transaction.description,
    category: transaction.category || transaction.mappedCategory || "",
    type: transaction.type || "",
    confidence: 45,
    confirmed: false,
    rejected: true,
    note: "ai_rejected_by_user",
  });
}

export function getLearnedRuleForTransaction(transaction) {
  const learning = loadTransactionLearning();

  const merchant = normalizeMerchant(
    transaction.merchant || transaction.description
  );

  if (!merchant) return null;

  if (learning[merchant]) {
    return learning[merchant];
  }

  const matched = Object.values(learning).find((rule) => {
    if (!rule?.merchant) return false;

    return (
      merchant.includes(rule.merchant) ||
      rule.merchant.includes(merchant)
    );
  });

  return matched || null;
}

export function getLearnedCategoryForTransaction(transaction) {
  return getLearnedRuleForTransaction(transaction)?.category || "";
}

export function getLearnedTypeForTransaction(transaction) {
  return getLearnedRuleForTransaction(transaction)?.type || "";
}

export function getLearningStats() {
  const learning = loadTransactionLearning();
  const rules = Object.values(learning);

  return {
    totalRules: rules.length,
    confirmedRules: rules.filter((rule) => rule.confirmed).length,
    rejectedRules: rules.filter((rule) => rule.rejected).length,
    categoryRules: rules.filter((rule) => rule.category).length,
    typeRules: rules.filter((rule) => rule.type).length,
  };
}

export function clearTransactionLearning() {
  localStorage.removeItem(STORAGE_KEY);
}

export function clearCategoryLearning() {
  clearTransactionLearning();
}