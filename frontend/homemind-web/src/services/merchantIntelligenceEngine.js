const MERCHANT_RULES = [
  {
    id: "spotify",
    aliases: ["spotify", "ספוטיפיי"],
    merchantName: "Spotify",
    category: "מנויים וטכנולוגיה",
    type: "subscription",
    confidence: 98,
  },
  {
    id: "openai",
    aliases: ["openai", "chatgpt"],
    merchantName: "OpenAI",
    category: "מנויים וטכנולוגיה",
    type: "subscription",
    confidence: 98,
  },
  {
    id: "claude",
    aliases: ["claude", "anthropic"],
    merchantName: "Claude AI",
    category: "מנויים וטכנולוגיה",
    type: "subscription",
    confidence: 98,
  },
  {
    id: "ksp",
    aliases: ["ksp"],
    merchantName: "KSP",
    category: "מחשבים ואלקטרוניקה",
    type: "expense",
    confidence: 95,
  },
  {
    id: "super_pharm",
    aliases: ["סופר פארם", "super pharm"],
    merchantName: "סופר פארם",
    category: "פארמה ובריאות",
    type: "expense",
    confidence: 95,
  },
  {
    id: "rami_levy",
    aliases: ["רמי לוי"],
    merchantName: "רמי לוי",
    category: "מזון וצריכה",
    type: "expense",
    confidence: 95,
  },
  {
    id: "max",
    aliases: ["מקס", "max", "איי פי חיוב"],
    merchantName: "MAX",
    category: "אשראי / סילוק כרטיס",
    type: "credit_card_settlement",
    confidence: 99,
  },
  {
    id: "isracard",
    aliases: ["ישראכרט"],
    merchantName: "ישראכרט",
    category: "אשראי / סילוק כרטיס",
    type: "credit_card_settlement",
    confidence: 99,
  },
  {
    id: "cal",
    aliases: ["כאל", "cal"],
    merchantName: "כאל",
    category: "אשראי / סילוק כרטיס",
    type: "credit_card_settlement",
    confidence: 99,
  },
  {
    id: "bit",
    aliases: ["bit", "ביט"],
    merchantName: "BIT",
    category: "העברות כספים",
    type: "transfer",
    confidence: 90,
  },
  {
    id: "binance",
    aliases: ["binance", "בינאנס"],
    merchantName: "Binance",
    category: "קריפטו והשקעות",
    type: "investment",
    confidence: 98,
  },
  {
    id: "salary",
    aliases: ["משכורת", "שכר", "salary"],
    merchantName: "משכורת",
    category: "הכנסה",
    type: "income",
    confidence: 98,
  },
  {
    id: "national_insurance",
    aliases: ["ביטוח לאומי", "בטוח לאומי", "קצבה"],
    merchantName: "ביטוח לאומי",
    category: "הכנסה",
    type: "income",
    confidence: 95,
  },
  {
    id: "cash_withdrawal",
    aliases: ["משיכת מזומן", "כספומט", "atm"],
    merchantName: "משיכת מזומן",
    category: "מזומן",
    type: "cash_withdrawal",
    confidence: 95,
  },
  {
    id: "bank_fee",
    aliases: ["עמלה", "עמלות"],
    merchantName: "עמלות בנק",
    category: "עמלות בנק",
    type: "expense",
    confidence: 90,
  },
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isExpenseLikeType(type) {
  return ["expense", "subscription", "investment", "cash_withdrawal"].includes(
    type
  );
}

function resolveFinalType(transaction, merchant) {
  const currentType = transaction.type;

  if (transaction.userCorrectedType && currentType) {
    return currentType;
  }

  if (merchant.type === "credit_card_settlement") {
    return "credit_card_settlement";
  }

  if (merchant.type === "transfer") {
    return "transfer";
  }

  if (merchant.type === "income") {
    return "income";
  }

  if (isExpenseLikeType(merchant.type)) {
    return "expense";
  }

  if (["income", "expense", "transfer"].includes(currentType)) {
    return currentType;
  }

  return "expense";
}

export function identifyMerchant(transaction) {
  const text = normalizeText(
    `${transaction.merchant || ""} ${transaction.description || ""} ${
      transaction.details || ""
    }`
  );

  for (const rule of MERCHANT_RULES) {
    const found = rule.aliases.some((alias) =>
      text.includes(normalizeText(alias))
    );

    if (found) {
      return rule;
    }
  }

  return {
    id: "unknown",
    merchantName: transaction.merchant || transaction.description || "לא מזוהה",
    category: transaction.category || "אחר",
    type: transaction.type || "expense",
    confidence: 60,
  };
}

export function enrichWithMerchantIntelligence(transaction) {
  const merchant = identifyMerchant(transaction);
  const finalType = resolveFinalType(transaction, merchant);

  return {
    ...transaction,
    type:
      finalType === "credit_card_settlement"
        ? "transfer"
        : finalType === "subscription" || finalType === "investment"
        ? "expense"
        : finalType,
    merchantId: merchant.id,
    normalizedMerchant: merchant.merchantName,
    aiCategory: merchant.category,
    aiType: finalType,
    confidence: merchant.confidence,
    isIncome: finalType === "income",
    isExpense: finalType === "expense" || isExpenseLikeType(finalType),
    isSubscription: merchant.type === "subscription",
    isTransfer: finalType === "transfer",
    isInvestment: merchant.type === "investment",
    isCreditCardSettlement: finalType === "credit_card_settlement",
    excludeFromTrueExpenses:
      finalType === "credit_card_settlement" || finalType === "transfer",
  };
}

export function enrichTransactionsWithMerchantIntelligence(transactions = []) {
  return transactions.map(enrichWithMerchantIntelligence);
}