import { useEffect, useState } from "react";

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

import TransactionsList from "../components/TransactionsList";
import AICopilotPanel from "../components/AICopilotPanel";
import MonthlyAnalytics from "../components/MonthlyAnalytics";
import SmartInsightsTimeline from "../components/SmartInsightsTimeline";
import TopNavigation from "../components/TopNavigation";
import FinancialHistoryExplorer from "../components/FinancialHistoryExplorer";
import MonthlyComparison from "../components/MonthlyComparison";
import CategoryBreakdown from "../components/CategoryBreakdown";
import TopMerchants from "../components/TopMerchants";
import SpendingTrends from "../components/SpendingTrends";
import DynamicInsightsPanel from "../components/DynamicInsightsPanel";
import AIRecommendationsPanel from "../components/AIRecommendationsPanel";
import HistoricalMemoryPanel from "../components/HistoricalMemoryPanel";
import LiveHumanAdvisor from "../components/LiveHumanAdvisor";
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
  { month: "פבר", value: 8.4 },
  { month: "מרץ", value: 8.9 },
  { month: "אפר", value: 9.3 },
  { month: "מאי", value: 10.4 },
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

function CollapsibleSection({
  title,
  subtitle,
  badge,
  icon = "▾",
  defaultOpen = false,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="mt-10 rounded-[34px] border border-white/10 bg-white/[0.035] backdrop-blur-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="w-full flex items-center justify-between gap-5 p-6 text-right hover:bg-white/[0.035] transition-all"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl bg-cyan-400/10 border border-cyan-300/20 text-cyan-300 flex items-center justify-center transition-transform shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <div className="text-2xl lg:text-3xl font-black truncate">
              {title}
            </div>

            {subtitle && (
              <div className="text-slate-400 mt-1 text-sm lg:text-base">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {badge && (
          <div className="hidden sm:block rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300 px-4 py-2 font-black shrink-0">
            {isOpen ? "פתוח" : badge}
          </div>
        )}
      </button>

      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </section>
  );
}

export default function Dashboard() {
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

    window.addEventListener("homemind:transactions-updated", refreshDashboardData);
    window.addEventListener("homemind:history-cleared", refreshDashboardData);
    window.addEventListener("storage", refreshDashboardData);

    return () => {
      window.removeEventListener(
        "homemind:transactions-updated",
        refreshDashboardData
      );
      window.removeEventListener("homemind:history-cleared", refreshDashboardData);
      window.removeEventListener("storage", refreshDashboardData);
    };
  }, []);

  const userAssets = assetsSummary.assets || [];
  const assetAllocationData = buildAssetAllocationData(userAssets);
  const dashboardSummary = calculateDashboardSummary(userAssets);
  const unifiedInsights = generateUnifiedInsights();

  const insights =
    unifiedInsights?.length > 0
      ? unifiedInsights
      : [
          `שלום ספי, ההון העצמי הכולל שלך עומד על כ־${formatCurrency(
            dashboardSummary.netWorth
          )}.`,
          `סך הנכסים שלך עומד על כ־${formatCurrency(
            dashboardSummary.totalAssets
          )}, מול התחייבויות של כ־${formatCurrency(
            dashboardSummary.totalDebt
          )}.`,
          `הכנסה חודשית מנכסים עומדת כרגע על כ־${formatCurrency(
            dashboardSummary.monthlyIncome
          )}.`,
        ];

  return (
    <div className="min-h-screen bg-[#020617] text-white flex" dir="rtl">
      <main className="flex-1 p-8">
        <div className="max-w-[1400px] mx-auto">
          <TopNavigation />

          <CollapsibleSection
            title="מרכז נתונים פיננסי"
            subtitle="ייבוא עו״ש ואשראי, בדיקת נתונים, מיפוי חכם ותזרים"
            badge="סגור"
            defaultOpen={true}
          >
            <FinancialDataHub
              onTransactionsProcessed={() => {
                setTransactions(loadStoredTransactions());
              }}
            />
          </CollapsibleSection>

          <div className="mt-10 mb-10">
            <LiveHumanAdvisor />
          </div>

          <div className="flex items-start justify-between mb-10 gap-6">
            <div>
              <div className="text-6xl font-black">👋 שלום ספי</div>

              <div className="text-slate-400 mt-3 text-xl">
                תמונת ההון והחיים הפיננסיים שלך, נכון להיום
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  localStorage.removeItem("homemind_user_assets");
                  localStorage.removeItem("homemind_user_assets_v1");
                  setAssetsSummary(calculateUserAssetsSummary());
                  setTransactions(loadStoredTransactions());
                  window.location.reload();
                }}
                className="bg-cyan-400 text-black font-bold rounded-2xl px-6 py-4"
              >
                רענן נתוני נכסים
              </button>
            </div>
          </div>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 min-w-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-3xl font-black">חלוקת ההון</div>
                  <div className="text-slate-400">חלוקת נכסים</div>
                </div>

                <div className="text-cyan-300 font-black">100%</div>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetAllocationData}
                      innerRadius={70}
                      outerRadius={110}
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

              <div className="space-y-4 mt-6">
                {assetAllocationData.map((asset, index) => (
                  <div
                    key={asset.name}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />

                      <div className="text-slate-300 truncate">
                        {asset.name}
                      </div>
                    </div>

                    <div className="font-black text-[clamp(16px,1.35vw,22px)] leading-tight text-left whitespace-nowrap tabular-nums">
                      {formatCurrency(asset.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="xl:col-span-2 rounded-[34px] bg-gradient-to-br from-cyan-500/10 to-indigo-500/20 border border-white/10 p-7 min-w-0">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="text-slate-300 text-xl">
                    ההון העצמי הכולל שלך
                  </div>

                  <div className="font-black mt-4 leading-tight text-[clamp(38px,4.4vw,72px)] break-words">
                    {formatCurrency(dashboardSummary.netWorth)}
                  </div>

                  <div className="flex gap-4 mt-6 flex-wrap">
                    <div className="bg-cyan-500/20 text-cyan-300 rounded-full px-5 py-2 font-bold">
                      {assetAllocationData.length} קבוצות נכסים
                    </div>

                    <div className="bg-emerald-500/20 text-emerald-300 rounded-full px-5 py-2 font-bold">
                      הכנסה מנכסים:{" "}
                      {formatCurrency(dashboardSummary.monthlyIncome)}
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-6 w-[300px] shrink-0 min-w-0">
                  <div className="text-slate-400 text-right">נכסים</div>

                  <div className="font-black mt-2 text-right leading-tight text-[clamp(26px,2.4vw,40px)] break-words tabular-nums">
                    {formatCurrency(dashboardSummary.totalAssets)}
                  </div>

                  <div className="border-t border-white/10 my-5" />

                  <div className="text-slate-400 text-right">התחייבויות</div>

                  <div className="font-black mt-2 text-rose-300 text-right leading-tight text-[clamp(26px,2.4vw,40px)] break-words tabular-nums">
                    {dashboardSummary.totalDebt > 0
                      ? `-${formatCurrency(dashboardSummary.totalDebt)}`
                      : formatCurrency(0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
                <div className="rounded-3xl bg-white/[0.05] border border-white/10 p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-emerald-300 font-black">
                      מתחילת השנה 15.2%+
                    </div>

                    <div className="text-slate-400">מגמת שווי נקי</div>
                  </div>

                  <div className="h-[160px] mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient
                            id="colorValue"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#22D3EE"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#22D3EE"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>

                        <XAxis dataKey="month" stroke="#64748B" />
                        <Tooltip />

                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#22D3EE"
                          fillOpacity={1}
                          fill="url(#colorValue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-3xl bg-indigo-400/10 border border-white/10 p-6">
                  <div className="text-3xl font-black mb-5">
                    תדרוך פיננסי חכם
                  </div>

                  <div className="space-y-4">
                    {insights.map((item) => (
                      <div key={item} className="text-slate-300 leading-7">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <CollapsibleSection
            title="מרכז הנכסים שלי"
            subtitle="ניהול נדל״ן, רכבים, קריפטו, עו״ש, פקדונות, ניירות ערך, קרנות השתלמות ופנסיות"
            badge="סגור"
          >
            <AssetsHub
              onAssetsChanged={() => {
                setAssetsSummary(calculateUserAssetsSummary());
              }}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="ניתוח חודשי"
            subtitle="ניתוח ביצועים לפי חודש"
            badge="סגור"
          >
            <MonthlyAnalytics transactions={transactions} />
          </CollapsibleSection>

          <CollapsibleSection
            title="מוח תזרים חכם"
            subtitle="ניתוח מאוחד של עו״ש, אשראי ותזרים"
            badge="סגור"
          >
            <UnifiedCashflowBrain />
          </CollapsibleSection>

          <CollapsibleSection
            title="מנוע ביטחון AI"
            subtitle="בדיקת רמת הביטחון של ה־AI במיפוי העסקאות"
            badge="סגור"
          >
            <AIConfidencePanel />
          </CollapsibleSection>

          <CollapsibleSection
            title="חוקר היסטוריה פיננסית"
            subtitle="חקירת ההיסטוריה הפיננסית"
            badge="סגור"
          >
            <FinancialHistoryExplorer />
          </CollapsibleSection>

          <CollapsibleSection
            title="זיכרון פיננסי היסטורי"
            subtitle="זיכרון פיננסי מצטבר לאורך זמן"
            badge="סגור"
          >
            <HistoricalMemoryPanel />
          </CollapsibleSection>

          <CollapsibleSection
            title="השוואה חודשית"
            subtitle="השוואת חודשים, הכנסות, הוצאות ותזרים"
            badge="סגור"
          >
            <MonthlyComparison />
          </CollapsibleSection>

          <CollapsibleSection
            title="פירוט לפי קטגוריות"
            subtitle="ניתוח הוצאות והכנסות לפי קטגוריות"
            badge="סגור"
          >
            <CategoryBreakdown />
          </CollapsibleSection>

          <CollapsibleSection
            title="בתי עסק מובילים"
            subtitle="זיהוי בתי העסק המשמעותיים ביותר בתנועות שלך"
            badge="סגור"
          >
            <TopMerchants />
          </CollapsibleSection>

          <CollapsibleSection
            title="מגמות הוצאות"
            subtitle="זיהוי שינויי התנהגות, חריגות ודפוסים חוזרים"
            badge="סגור"
          >
            <SpendingTrends />
          </CollapsibleSection>

          <CollapsibleSection
            title="עוזר חכם ותובנות פיננסיות"
            subtitle="עוזר פיננסי חכם לצד ציר תובנות"
            badge="חדש"
          >
            <FinancialAICopilot />
          </CollapsibleSection>

          <CollapsibleSection
            title="תובנות דינמיות"
            subtitle="תובנות משתנות על בסיס הנתונים שלך"
            badge="סגור"
          >
            <DynamicInsightsPanel />
          </CollapsibleSection>

          <CollapsibleSection
            title="המלצות חכמות"
            subtitle="המלצות פיננסיות מותאמות אישית"
            badge="סגור"
          >
            <AIRecommendationsPanel />
          </CollapsibleSection>

          <CollapsibleSection
            title="מלאי נכסים ותנועות"
            subtitle="תמונת נכסים לצד רשימת תנועות אחרונות"
            badge="סגור"
          >
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div>
                <div className="text-2xl font-black mb-5">מלאי נכסים</div>

                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                  {assetAllocationData.map((asset) => (
                    <div
                      key={asset.name}
                      className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 min-w-0"
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
          </CollapsibleSection>
        </div>
      </main>
    </div>
  );
}