export const accounts = [
  {
    id: 'bank-hapoalim-checking',
    name: 'עו״ש הפועלים',
    institution: 'בנק הפועלים',
    type: 'checking',
    balance: 152000,
    currency: 'ILS',
  },
  {
    id: 'bank-leumi-savings',
    name: 'פיקדון לאומי',
    institution: 'בנק לאומי',
    type: 'deposit',
    balance: 348000,
    currency: 'ILS',
  },
  {
    id: 'max-credit-card',
    name: 'כרטיס אשראי MAX',
    institution: 'MAX',
    type: 'credit_card',
    balance: -28600,
    currency: 'ILS',
  },
];

export const assets = [
  {
    id: 'real-estate-1',
    name: 'דירת מגורים',
    category: 'real_estate',
    label: 'נדל״ן',
    value: 4178300,
    trend: 2.1,
    icon: '🏠',
  },
  {
    id: 'pension-1',
    name: 'פנסיה וביטוחי מנהלים',
    category: 'pension',
    label: 'ביטוחי מנהלים / פנסיות',
    value: 2258900,
    trend: 4.8,
    icon: '🏦',
  },
  {
    id: 'investment-1',
    name: 'תיק השקעות',
    category: 'investments',
    label: 'השקעות',
    value: 23796,
    trend: 6.3,
    icon: '📈',
  },
  {
    id: 'crypto-1',
    name: 'קריפטו',
    category: 'crypto',
    label: 'קריפטו',
    value: 33155,
    trend: 12.4,
    icon: '🪙',
  },
  {
    id: 'liquid-1',
    name: 'עו״ש ופיקדונות',
    category: 'cash',
    label: 'נזילות',
    value: 500000,
    trend: 0,
    icon: '💰',
  },
  {
    id: 'vehicle-1',
    name: 'רכבים',
    category: 'vehicles',
    label: 'רכבים',
    value: 108000,
    trend: -1.2,
    icon: '🚗',
  },
];

export const liabilities = [
  {
    id: 'mortgage-1',
    name: 'משכנתא',
    category: 'mortgage',
    value: 1320000,
    interestRate: 4.8,
  },
  {
    id: 'loan-1',
    name: 'הלוואה בנקאית',
    category: 'loan',
    value: 145000,
    interestRate: 7.2,
  },
  {
    id: 'credit-1',
    name: 'יתרת אשראי',
    category: 'credit',
    value: 28600,
    interestRate: 0,
  },
];

export const transactions = [
  {
    id: 'tx-1',
    date: '2026-05-02',
    merchant: 'רמי לוי',
    category: 'מזון וסופר',
    amount: -720,
    accountId: 'max-credit-card',
    recurring: false,
  },
  {
    id: 'tx-2',
    date: '2026-05-04',
    merchant: 'OpenAI',
    category: 'מנויים וטכנולוגיה',
    amount: -79,
    accountId: 'max-credit-card',
    recurring: true,
  },
  {
    id: 'tx-3',
    date: '2026-05-05',
    merchant: 'Claude AI',
    category: 'מנויים וטכנולוגיה',
    amount: -73,
    accountId: 'max-credit-card',
    recurring: true,
  },
  {
    id: 'tx-4',
    date: '2026-05-07',
    merchant: 'מסעדות',
    category: 'בילויים ומסעדות',
    amount: -1240,
    accountId: 'max-credit-card',
    recurring: false,
  },
  {
    id: 'tx-5',
    date: '2026-05-09',
    merchant: 'Binance',
    category: 'קריפטו והשקעות',
    amount: -5000,
    accountId: 'max-credit-card',
    recurring: false,
  },
  {
    id: 'tx-6',
    date: '2026-05-10',
    merchant: 'משכורת',
    category: 'הכנסה',
    amount: 52000,
    accountId: 'bank-hapoalim-checking',
    recurring: true,
  },
];

export const monthlyWealthTrend = [
  { month: 'ינו׳', value: 10800000 },
  { month: 'פבר׳', value: 11100000 },
  { month: 'מרץ', value: 11600000 },
  { month: 'אפר׳', value: 12000000 },
  { month: 'מאי', value: 12457000 },
];

export const monthlyCashflow = [
  { month: 'ינו׳', income: 52000, expenses: 38000 },
  { month: 'פבר׳', income: 49000, expenses: 41000 },
  { month: 'מרץ', income: 55000, expenses: 36000 },
  { month: 'אפר׳', income: 53000, expenses: 42000 },
  { month: 'מאי', income: 57000, expenses: 34000 },
];

export const goals = [
  {
    id: 'goal-financial-freedom',
    name: 'חופש כלכלי',
    target: 20000000,
    current: 12457000,
  },
  {
    id: 'goal-emergency-fund',
    name: 'קרן חירום',
    target: 600000,
    current: 500000,
  },
  {
    id: 'goal-retirement',
    name: 'פרישה',
    target: 8000000,
    current: 4600000,
  },
];

export const insights = [
  {
    id: 'insight-1',
    type: 'positive',
    title: 'ההון גדל',
    text: 'עלייה של 4.2% בהון הכולל החודש.',
    icon: '🔥',
  },
  {
    id: 'insight-2',
    type: 'warning',
    title: 'ריכוז סיכון',
    text: 'החשיפה לקריפטו גבוהה יחסית לפרופיל שמרני.',
    icon: '⚠️',
  },
  {
    id: 'insight-3',
    type: 'saving',
    title: 'חיסכון אפשרי',
    text: 'זוהו כ־₪680 בחודש במנויים והוצאות חוזרות.',
    icon: '💡',
  },
];