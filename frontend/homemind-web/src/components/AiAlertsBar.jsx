import { useEffect, useMemo, useState } from "react";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";

import AiAlertsBar from "../components/AiAlertsBar";
import TransactionsList from "../components/TransactionsList";
import MonthlyAnalytics from "../components/MonthlyAnalytics";
import TopNavigation from "../components/TopNavigation";
import FinancialHistoryExplorer from "../components/FinancialHistoryExplorer";
import MonthlyComparison from "../components/MonthlyComparison";
import CategoryBreakdown from "../components/CategoryBreakdown";
import TopMerchants from "../components/TopMerchants";
import SpendingTrends from "../components/SpendingTrends";
import DynamicInsightsPanel from "../components/DynamicInsightsPanel";
import AIRecommendationsPanel from "../components/AIRecommendationsPanel";
import UnifiedCashflowBrain from "../components/UnifiedCashflowBrain";
import AssetsHub from "../components/AssetsHub";
import FinancialDataHub from "../components/FinancialDataHub";
import { generateUnifiedInsights } from "../services/unifiedFinancialEngine";
import { calculateUserAssetsSummary } from "../services/userAssetsStore";
import { runDailyValuationSyncIfNeeded } from "../services/valuationEngine";
import AIConfidencePanel from "../components/AIConfidencePanel";
import FinancialAICopilot from "../components/FinancialAICopilot";
import { loadStoredTransactions } from "../services/transactionStore";

const COLORS = [
  "#38BDF8",
  "#34D399",
  "#A78BFA",
  "#F59E0B",
  "#22D3EE",
  "#FB7185",
  "#F472B6",
  "#A3E635",
];

const trendData = [
  { month: "ינו", value: 8.2 },
  { month: "פבר", value: 8.9 },
  { month: "מרץ", value: 9.6 },
  { month: "אפר", value: 10.1 },
  { month: "מאי", value: 11.2 },
];

function formatCurrency(value) {
  return `₪${Math.round(Number(value || 0)).toLocaleString("he-IL")}`;
}

function getAssetGroup(asset) {
  const type = asset.type;

  if (type === "real_estate") return "נדל״ן";
  if (type === "vehicle") return "רכבים";
  if (type === "crypto") return "קריפטו";
  if (type === "checking_account") return "עו״ש בנקאי";
  if (type === "cash") return "עו״ש בנקאי";
  if (type === "bank_deposit") return "פקדונות בנקאיים";
  if (type === "securities") return "ניירות ערך";
  if (type === "investment") return "ניירות ערך";
  if (type === "keren_hishtalmut") return "קרנות השתלמות";
  if (type === "investment_fund") return "קרנות השתלמות";
  if (type === "pension") return "ביטוחי מנהלים / פנסיות";
  if (type === "liability") return "התחייבויות";
  if (type === "other_asset") return "נכס אחר";

  return "אחר";
}

function getAssetIcon(name) {
  if (name === "נדל״ן") return "🏠";
  if (name === "רכבים") return "🚗";
  if (name === "קריפטו") return "🪙";
  if (name === "עו״ש בנקאי") return "💳";
  if (name === "פקדונות בנקאיים") return "🏦";
  if (name === "ניירות ערך") return "📊";
  if (name === "קרנות השתלמות") return "📈";
  if (name === "ביטוחי מנהלים / פנסיות") return "🏛️";
  if (name === "התחייבויות") return "⚠️";
  if (name === "נכס אחר") return "💎";

  return "📦";
}

function buildAssetAllocationData(assets) {
  const grouped = {};

  assets
    .filter((asset) => asset.type !== "liability")
    .forEach((asset) => {
      const group = getAssetGroup(asset);
      const value = Math.max(Number(asset.estimatedValue || 0), 0);
      grouped[group] = (grouped[group] || 0) + value;
    });

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function calculateDashboardSummary(assets) {
  const positiveAssets = assets.filter((asset) => asset.type !== "liability");

  const totalAssets = positiveAssets.reduce(
    (sum, asset) => sum + Math.max(Number(asset.estimatedValue || 0), 0),
    0
  );

  const nonLiabilityDebt = positiveAssets.reduce(
    (sum, asset) => sum + Math.max(Number(asset.debt || 0), 0),
    0
  );

  const liabilityDebt = assets
    .filter((asset) => asset.type === "liability")
    .reduce((sum, asset) => {
      const estimatedDebt = Math.abs(Number(asset.estimatedValue || 0));
      const explicitDebt = Math.abs(Number(asset.debt || 0));
      return sum + Math.max(estimatedDebt, explicitDebt);
    }, 0);

  const totalDebt = nonLiabilityDebt + liabilityDebt;

  const monthlyIncome = positiveAssets.reduce(
    (sum, asset) => sum + Number(asset.monthlyIncome || 0),
    0
  );

  return {
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
    monthlyIncome,
  };
}

function PremiumPanel({ children, className = "" }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[30px] border border-cyan-300/15 bg-[#06111f]/80 shadow-[0_0_45px_rgba(34,211,238,0.08)] backdrop-blur-2xl ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/[0.08] via-transparent to-indigo-500/[0.07] pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function DashboardTabShell({ title, subtitle, children }) {
  return (
    <PremiumPanel className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="text-3xl lg:text-5xl font-black">{title}</div>
        {subtitle && (
          <div className="text-slate-400 mt-3 text-base lg:text-xl">
            {subtitle}
          </div>
        )}
      </div>

      {children}
    </PremiumPanel>
  );
}

export default function Dashboard() {
const [activeTab, setActiveTab] = useState("dashboard");

  const [transactions, setTransactions] = useState(() =>
    loadStoredTransactions()
  );

  const [assetsSummary, setAssetsSummary] = useState(() =>
    calculateUserAssetsSummary()
  );

  useEffect(() => {
    const refreshDashboardData = () => {
      setTransactions(loadStoredTransactions());
      setAssetsSummary(calculateUserAssetsSummary());
    };

    runDailyValuationSyncIfNeeded();
    refreshDashboardData();

    window.addEventListener(
      "homemind:transactions-updated",
      refreshDashboardData
    );
    window.addEventListener("homemind:history-cleared", refreshDashboardData);
    window.addEventListener("storage", refreshDashboardData);

    return () => {
      window.removeEventListener(
        "homemind:transactions-updated",
        refreshDashboardData
      );
      window.removeEventListener(
        "homemind:history-cleared",
        refreshDashboardData
      );
      window.removeEventListener("storage", refreshDashboardData);
    };
  }, []);

  const userAssets = useMemo(
    () => assetsSummary.assets || [],
    [assetsSummary.assets]
  );

  const assetAllocationData = useMemo(
    () => buildAssetAllocationData(userAssets),
    [userAssets]
  );

  const dashboardSummary = useMemo(
    () => calculateDashboardSummary(userAssets),
    [userAssets]
  );

  const unifiedInsights = generateUnifiedInsights();

  const insights =
    unifiedInsights?.length > 0
      ? unifiedInsights.slice(0, 5)
      : [
          "נפתחו 409 תנועות מכל המקורות: עו״ש וכרטיסי אשראי.",
          "הכנסות אחרונות ללא כפילות והוצאות אחרונות ללא כפילות זוהו בהצלחה.",
          "התזרים המאוחד שלך עומד על תמונה חיובית אך דורש מעקב.",
          "נמצאה אינדיקציה למניעת ספירה כפולה.",
          "המערכת מוכנה להמשך ניתוח עומק.",
        ];

const tabs = [
    {
      id: "dashboard",
      icon: "🏠",
      title: "דשבורד מרכזי",
      subtitle: "תמונת מצב פיננסית מלאה",
    },
    {
      id: "data",
      icon: "🛢️",
      title: "מרכז נתונים",
      subtitle: "ייבוא, מיפוי ובדיקת עסקאות",
    },
    {
      id: "assets",
      icon: "🏛️",
      title: "מרכז נכסים",
      subtitle: "ניהול כלל הנכסים",
    },
    {
      id: "monthly",
      icon: "🗓️",
      title: "ניתוח חודשי",
      subtitle: "ביצועים לפי חודש",
    },
    {
      id: "cashflow",
      icon: "🧠",
      title: "מוח תזרים",
      subtitle: "עו״ש, אשראי ותזרים",
    },
    {
      id: "confidence",
      icon: "🛡️",
      title: "ביטחון AI",
      subtitle: "אמינות מיפוי העסקאות",
    },
    {
      id: "history",
      icon: "🔎",
      title: "חוקר היסטוריה",
      subtitle: "חיפוש עומק פיננסי",
    },
    {
      id: "comparison",
      icon: "⚖️",
      title: "השוואה חודשית",
      subtitle: "חודש מול חודש",
    },
    {
      id: "categories",
      icon: "🧩",
      title: "קטגוריות",
      subtitle: "הכנסות והוצאות",
    },
    {
      id: "merchants",
      icon: "🏪",
      title: "בתי עסק",
      subtitle: "היכן הכסף יוצא",
    },
    {
      id: "trends",
      icon: "📈",
      title: "מגמות",
      subtitle: "דפוסים וחריגות",
    },
    {
      id: "copilot",
      icon: "✨",
      title: "עוזר חכם",
      subtitle: "תובנות ושיחה פיננסית",
      badge: "חדש",
    },
    {
      id: "dynamic",
      icon: "⚡",
      title: "תובנות דינמיות",
      subtitle: "תובנות משתנות",
    },
    {
      id: "recommendations",
      icon: "🎯",
      title: "המלצות חכמות",
      subtitle: "פעולות מומלצות",
    },
    {
      id: "inventory",
      icon: "📦",
      title: "מלאי ותנועות",
      subtitle: "נכסים ועסקאות אחרונות",
    },
  ];

  const renderActiveTab = () => {
    if (activeTab === "data") {
      return (
        <DashboardTabShell
          title="מרכז נתונים פיננסי"
          subtitle="ייבוא עו״ש ואשראי, בדיקת נתונים, מיפוי חכם ותזרים"
        >
          <FinancialDataHub
            onTransactionsProcessed={() => {
              setTransactions(loadStoredTransactions());
            }}
          />
        </DashboardTabShell>
      );
    }

    if (activeTab === "assets") {
      return (
        <DashboardTabShell
          title="מרכז הנכסים שלי"
          subtitle="ניהול נדל״ן, רכבים, קריפטו, עו״ש, פקדונות, ניירות ערך, קרנות השתלמות ופנסיות"
        >
          <AssetsHub
            onAssetsChanged={() => {
              setAssetsSummary(calculateUserAssetsSummary());
            }}
          />
        </DashboardTabShell>
      );
    }

    if (activeTab === "monthly") {
      return (
        <DashboardTabShell title="ניתוח חודשי" subtitle="ניתוח ביצועים לפי חודש">
          <MonthlyAnalytics transactions={transactions} />
        </DashboardTabShell>
      );
    }

    if (activeTab === "cashflow") {
      return (
        <DashboardTabShell
          title="מוח תזרים חכם"
          subtitle="ניתוח מאוחד של עו״ש, אשראי ותזרים"
        >
          <UnifiedCashflowBrain />
        </DashboardTabShell>
      );
    }

    if (activeTab === "confidence") {
      return (
        <DashboardTabShell
          title="מנוע ביטחון AI"
          subtitle="בדיקת רמת הביטחון של ה־AI במיפוי העסקאות"
        >
          <AIConfidencePanel />
        </DashboardTabShell>
      );
    }

    if (activeTab === "history") {
      return (
        <DashboardTabShell
          title="חוקר היסטוריה פיננסית"
          subtitle="חקירת ההיסטוריה הפיננסית"
        >
          <FinancialHistoryExplorer />
        </DashboardTabShell>
      );
    }

    if (activeTab === "comparison") {
      return (
        <DashboardTabShell
          title="השוואה חודשית"
          subtitle="השוואת חודשים, הכנסות, הוצאות ותזרים"
        >
          <MonthlyComparison />
        </DashboardTabShell>
      );
    }

    if (activeTab === "categories") {
      return (
        <DashboardTabShell
          title="פירוט לפי קטגוריות"
          subtitle="ניתוח הוצאות והכנסות לפי קטגוריות"
        >
          <CategoryBreakdown />
        </DashboardTabShell>
      );
    }

    if (activeTab === "merchants") {
      return (
        <DashboardTabShell
          title="בתי עסק מובילים"
          subtitle="זיהוי בתי העסק המשמעותיים ביותר בתנועות שלך"
        >
          <TopMerchants />
        </DashboardTabShell>
      );
    }

    if (activeTab === "trends") {
      return (
        <DashboardTabShell
          title="מגמות הוצאות"
          subtitle="זיהוי שינויי התנהגות, חריגות ודפוסים חוזרים"
        >
          <SpendingTrends />
        </DashboardTabShell>
      );
    }

    if (activeTab === "copilot") {
      return (
        <DashboardTabShell
          title="עוזר חכם ותובנות פיננסיות"
          subtitle="עוזר פיננסי חכם לצד ציר תובנות"
        >
          <FinancialAICopilot />
        </DashboardTabShell>
      );
    }

    if (activeTab === "dynamic") {
      return (
        <DashboardTabShell
          title="תובנות דינמיות"
          subtitle="תובנות משתנות על בסיס הנתונים שלך"
        >
          <DynamicInsightsPanel />
        </DashboardTabShell>
      );
    }

    if (activeTab === "recommendations") {
      return (
        <DashboardTabShell
          title="המלצות חכמות"
          subtitle="המלצות פיננסיות מותאמות אישית"
        >
          <AIRecommendationsPanel />
        </DashboardTabShell>
      );
    }

    if (activeTab === "inventory") {
      return (
        <DashboardTabShell
          title="מלאי נכסים ותנועות"
          subtitle="תמונת נכסים לצד רשימת תנועות אחרונות"
        >
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div>
              <div className="text-2xl font-black mb-5">מלאי נכסים</div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                {assetAllocationData.map((asset) => (
                  <div
                    key={asset.name}
                    className="rounded-[26px] border border-cyan-300/15 bg-white/[0.04] p-6 min-w-0"
                  >
                    <div className="text-5xl mb-5">
                      {getAssetIcon(asset.name)}
                    </div>

                    <div className="text-xl text-slate-300 truncate">
                      {asset.name}
                    </div>

                    <div className="font-black mt-4 leading-tight tracking-tight text-[clamp(22px,2vw,36px)] break-words tabular-nums">
                      {formatCurrency(asset.value)}
                    </div>

                    <div className="text-emerald-300 font-bold mt-3">
                      מעודכן
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <TransactionsList transactions={transactions} />
          </section>
        </DashboardTabShell>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-220px] right-[12%] w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-[150px]" />
        <div className="absolute bottom-[-260px] left-[18%] w-[620px] h-[620px] rounded-full bg-indigo-500/10 blur-[170px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden xl:flex w-[350px] shrink-0 border-l border-cyan-300/15 bg-[#020617]/95 backdrop-blur-3xl sticky top-0 h-screen overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent" />
          <div className="absolute right-[-7px] top-[150px] w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_25px_rgba(34,211,238,1)]" />

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-120px] right-[-90px] w-[300px] h-[300px] rounded-full bg-cyan-500/20 blur-[120px]" />
            <div className="absolute bottom-[-150px] left-[-100px] w-[340px] h-[340px] rounded-full bg-indigo-500/20 blur-[140px]" />
            <div className="absolute top-[40%] left-[-140px] w-[240px] h-[240px] rounded-full bg-purple-500/10 blur-[120px]" />
          </div>

          <div className="relative z-10 w-full p-4 flex flex-col">
            <div className="rounded-[34px] border border-cyan-300/20 bg-white/[0.045] backdrop-blur-2xl p-5 mb-5 shadow-[0_0_65px_rgba(34,211,238,0.09)] overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/[0.12] via-transparent to-indigo-500/[0.10]" />

              <div className="relative z-10 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[40px] font-black leading-tight tracking-tight">
                    HomeMind
                    <br />
                    AI
                  </div>

                  <div className="text-cyan-300 text-[11px] font-black tracking-[0.22em] mt-3 uppercase">
                    Financial Command Center
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-cyan-400 blur-[22px] opacity-35" />
                  <div className="relative w-17 h-17 rounded-3xl bg-gradient-to-br from-cyan-300 via-blue-500 to-purple-600 flex items-center justify-center text-3xl shadow-[0_0_45px_rgba(34,211,238,0.45)]">
                    🧠
                  </div>
                </div>
              </div>
            </div>

            <div className="text-cyan-300 text-xs font-black tracking-[0.18em] mb-3 px-2">
              ✦ AI COMMAND CENTER ✦
            </div>

            <div className="flex-1 overflow-y-auto pl-1 pr-1 space-y-3">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative w-full overflow-hidden rounded-[28px] border text-right transition-all duration-500 backdrop-blur-2xl ${
                      isActive
                        ? "border-cyan-300/60 bg-gradient-to-l from-cyan-400/[0.14] via-cyan-300/[0.05] to-transparent shadow-[0_0_55px_rgba(34,211,238,0.22)]"
                        : "border-white/[0.05] bg-white/[0.025] hover:border-cyan-300/20 hover:bg-white/[0.05] hover:shadow-[0_0_35px_rgba(34,211,238,0.08)]"
                    }`}
                  >
                    {isActive && (
                      <>
                        <div className="absolute right-0 top-0 bottom-0 w-[6px] bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,1)]" />
                        <div className="absolute inset-0 bg-gradient-to-l from-cyan-400/20 via-cyan-300/5 to-transparent" />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-cyan-400/10 blur-[35px]" />
                      </>
                    )}

                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-l from-white/[0.05] to-transparent" />

                    <div className="relative z-10 flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`relative w-14 h-14 rounded-[22px] flex items-center justify-center text-2xl shrink-0 transition-all duration-500 ${
                            isActive
                              ? "bg-gradient-to-br from-cyan-300 to-blue-500 text-black shadow-[0_0_40px_rgba(34,211,238,0.65)]"
                              : "bg-white/[0.06] border border-white/[0.08] group-hover:border-cyan-300/20"
                          }`}
                        >
                          {isActive && (
                            <div className="absolute inset-0 rounded-[22px] bg-cyan-300 blur-[18px] opacity-20" />
                          )}

                          <span className="relative z-10">{tab.icon}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-black text-[16px] tracking-wide truncate">
                              {tab.title}
                            </div>

                            {tab.badge && (
                              <div className="rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-[10px] font-black px-2 py-1 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
                                {tab.badge}
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 truncate mt-1">
                            {tab.subtitle}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                          isActive
                            ? "bg-cyan-200 shadow-[0_0_20px_rgba(34,211,238,1)]"
                            : "bg-cyan-400/50 group-hover:bg-cyan-300/80"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 lg:p-6">
          <div className="max-w-[1680px] mx-auto">
            <TopNavigation />

            <AiAlertsBar />

            <header className="mb-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 p-[3px] shadow-[0_0_28px_rgba(34,211,238,0.45)]">
                    <div className="w-full h-full rounded-full bg-[#07111f] flex items-center justify-center text-2xl">
                      👤
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#020617]" />
                </div>

                <div>
                  <div className="text-4xl font-black tracking-tight">
                    שלום ספי 👋
                  </div>

                  <div className="text-slate-300 mt-1 text-base">
                    מלאי ותנועות — נכסים ועסקאות אחרונות
                  </div>
                </div>
              </div>
            </header>

{activeTab === "dashboard" && (
  <>
    <section className="grid grid-cols-1 2xl:grid-cols-[1.1fr_0.9fr] gap-5 mb-5">
              <PremiumPanel className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-[0.72fr_1fr] gap-4">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
                    <div className="text-2xl mb-2">💳</div>

                    <div className="text-slate-400 text-sm">נכסים</div>

                    <div className="text-2xl font-black mt-2">
                      {formatCurrency(dashboardSummary.totalAssets)}
                    </div>

                    <div className="border-t border-white/10 my-3" />

                    <div className="text-slate-400 text-sm">התחייבויות</div>

                    <div className="text-2xl font-black mt-2 text-rose-300">
                      {dashboardSummary.totalDebt > 0
                        ? `-${formatCurrency(dashboardSummary.totalDebt)}`
                        : formatCurrency(0)}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4 flex flex-col justify-center">
                    <div className="text-slate-300 text-base">
                      ההון העצמי הכולל שלך
                    </div>

                    <div className="font-black mt-2 text-[clamp(34px,4vw,56px)] leading-tight">
                      {formatCurrency(dashboardSummary.netWorth)}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-300 px-4 py-2 text-sm font-black">
                        הכנסה מנכסים:{" "}
                        {formatCurrency(dashboardSummary.monthlyIncome)}
                      </div>

                      <div className="rounded-full bg-cyan-500/20 text-cyan-300 px-4 py-2 text-sm font-black">
                        {assetAllocationData.length} קבוצות נכסים
                      </div>
                    </div>
                  </div>
                </div>
              </PremiumPanel>

              <PremiumPanel className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-2xl font-black">חלוקת ההון</div>
                    <div className="text-slate-400 mt-1 text-sm">חלוקת נכסים</div>
                  </div>

                  <div className="text-cyan-300 text-lg font-black">100%</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1fr] gap-4 items-center mt-2">
                  <div className="h-[165px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetAllocationData}
                          innerRadius={44}
                          outerRadius={68}
                          dataKey="value"
                        >
                          {assetAllocationData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {assetAllocationData.map((asset, index) => (
                      <div
                        key={asset.name}
                        className="grid grid-cols-[1fr_auto] items-center gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />

                          <div className="text-slate-300 text-sm truncate">
                            {asset.name}
                          </div>
                        </div>

                        <div className="font-black text-sm tabular-nums">
                          {formatCurrency(asset.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </PremiumPanel>
            </section>

            <section className="grid grid-cols-1 2xl:grid-cols-[0.8fr_0.75fr_1.2fr] gap-5 mb-5">
              <PremiumPanel className="p-5">
                <div className="text-3xl mb-3">✨</div>
                <div className="text-2xl font-black mb-4">תדרוך פיננסי חכם</div>

                <div className="space-y-3">
                  {insights.slice(0, 4).map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 flex items-center justify-between gap-3"
                    >
                      <div className="text-slate-200 leading-6 text-sm">
                        {item}
                      </div>

                      <div className="w-9 h-9 rounded-2xl bg-cyan-400/10 border border-cyan-300/20 text-cyan-300 flex items-center justify-center shrink-0">
                        {index === 0
                          ? "✓"
                          : index === 1
                          ? "▥"
                          : index === 2
                          ? "⌁"
                          : "◇"}
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumPanel>

              <PremiumPanel className="p-5">
                <div className="text-2xl font-black">מגמת שווי נקי</div>
                <div className="text-emerald-300 mt-1 font-black text-lg">
                  +15.2% מתחילת השנה
                </div>

                <div className="h-[245px] mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient
                          id="premiumValue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#22D3EE"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22D3EE"
                            stopOpacity={0.04}
                          />
                        </linearGradient>
                      </defs>

                      <XAxis dataKey="month" stroke="#94A3B8" />
                      <Tooltip />

                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#22D3EE"
                        strokeWidth={4}
                        fill="url(#premiumValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </PremiumPanel>

              <PremiumPanel className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-black">מלאי נכסים</div>

                  <button
                    onClick={() => setActiveTab("inventory")}
                    className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-emerald-300 text-sm font-black"
                  >
                    לצפייה מלאה
                  </button>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {assetAllocationData.slice(0, 6).map((asset) => (
                    <div
                      key={asset.name}
                      className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-center"
                    >
                      <div className="text-3xl mb-2">
                        {getAssetIcon(asset.name)}
                      </div>
                      <div className="text-slate-300 text-sm">{asset.name}</div>
                      <div className="font-black mt-2 text-lg">
                        {formatCurrency(asset.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumPanel>
            </section>

              </>
)}

{renderActiveTab()}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {[
                ["ת״א 125", "+0.68%", "2,071.45"],
                ["S&P 500", "+0.41%", "5,315.01"],
                ["BITCOIN", "+1.23%", "$67,243"],
                ["GOLD", "-0.28%", "₪8,512"],
              ].map(([name, change, value]) => (
                <div
                  key={name}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3 flex items-center justify-between"
                >
                  <div className="font-black">{name}</div>
                  <div
                    className={
                      change.startsWith("+")
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }
                  >
                    {change}
                  </div>
                  <div className="text-slate-300">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
