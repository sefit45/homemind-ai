import { useMemo } from "react";
import { generateUnifiedFinancialBrain } from "../services/unifiedFinancialBrain";

function formatCurrency(value) {
  return `₪${Math.round(Number(value || 0)).toLocaleString("he-IL")}`;
}

function getToneClasses(tone) {
  if (tone === "emerald") {
    return {
      text: "text-emerald-300",
      border: "border-emerald-300/25",
      bg: "bg-emerald-400/10",
      glow: "shadow-[0_0_35px_rgba(74,222,128,0.12)]",
    };
  }

  if (tone === "rose") {
    return {
      text: "text-rose-300",
      border: "border-rose-300/25",
      bg: "bg-rose-400/10",
      glow: "shadow-[0_0_35px_rgba(251,113,133,0.12)]",
    };
  }

  return {
    text: "text-amber-300",
    border: "border-amber-300/25",
    bg: "bg-amber-400/10",
    glow: "shadow-[0_0_35px_rgba(251,191,36,0.12)]",
  };
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 min-w-0">
      <div className="text-slate-400 text-sm font-bold">{label}</div>

      <div className="mt-3 text-[clamp(22px,2.4vw,36px)] font-black leading-tight break-words tabular-nums">
        {value}
      </div>

      {hint && <div className="mt-2 text-xs text-slate-500 leading-5">{hint}</div>}
    </div>
  );
}

function SignalCard({ item, index }) {
  const severityClasses =
    item.severity === "high"
      ? "border-rose-300/25 bg-rose-400/10 text-rose-200"
      : item.severity === "medium"
      ? "border-amber-300/25 bg-amber-400/10 text-amber-200"
      : "border-cyan-300/20 bg-cyan-400/10 text-cyan-200";

  return (
    <div className={`rounded-[22px] border p-4 ${severityClasses}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 font-black">
          {index + 1}
        </div>

        <div>
          <div className="font-black text-white">{item.title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">
            {item.description}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnifiedFinancialBrainPanel() {
  const brain = useMemo(() => generateUnifiedFinancialBrain(), []);
  const tone = getToneClasses(brain.risk.tone);

  return (
    <div className="space-y-6" dir="rtl">
      <section
        className={`relative overflow-hidden rounded-[30px] border ${tone.border} ${tone.bg} ${tone.glow} p-6 lg:p-8`}
      >
        <div className="absolute inset-0 bg-gradient-to-l from-cyan-400/[0.08] via-transparent to-indigo-500/[0.08] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[0.75fr_1.25fr] gap-8 items-center">
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 rounded-full border border-cyan-300/20 bg-[#07111f] flex items-center justify-center shadow-[0_0_60px_rgba(34,211,238,0.12)]">
              <div className="absolute inset-3 rounded-full border border-white/10" />

              <div className={`text-5xl font-black ${tone.text}`}>
                {brain.financialHealthScore}
              </div>

              <div className="absolute bottom-7 text-[11px] text-slate-400 font-black tracking-[0.18em]">
                SCORE
              </div>
            </div>

            <div>
              <div className="text-slate-400 font-bold">רמת סיכון</div>

              <div className={`mt-2 text-4xl font-black ${tone.text}`}>
                {brain.risk.level}
              </div>

              <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-black">
                {brain.risk.label}
              </div>
            </div>
          </div>

          <div>
            <div className="text-3xl lg:text-5xl font-black leading-tight">
              {brain.executiveSummary.title}
            </div>

            <div className="mt-4 text-slate-300 text-lg leading-8">
              {brain.executiveSummary.description}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-cyan-100 leading-7">
              {brain.executiveSummary.mainInsight}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
        <MetricCard
          label="שווי נקי"
          value={formatCurrency(brain.metrics.netWorth)}
          hint="נכסים פחות התחייבויות"
        />

        <MetricCard
          label="תזרים מאוחד"
          value={formatCurrency(brain.metrics.trueNetCashflow)}
          hint="הכנסות פחות הוצאות ללא כפילות אשראי"
        />

        <MetricCard
          label="עסקאות שנותחו"
          value={brain.metrics.transactionsCount.toLocaleString("he-IL")}
          hint="כל המקורות המאוחדים"
        />

        <MetricCard
          label="ביטחון AI ממוצע"
          value={`${Math.round(brain.metrics.averageConfidence || 0)}%`}
          hint="איכות מיפוי וסיווג עסקאות"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
          <div className="text-2xl font-black mb-5">איתותי לחץ</div>

          <div className="space-y-4">
            {brain.stressSignals.map((item, index) => (
              <SignalCard key={`${item.title}-${index}`} item={item} index={index} />
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
          <div className="text-2xl font-black mb-5">הזדמנויות</div>

          <div className="space-y-4">
            {brain.opportunities.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="rounded-[22px] border border-emerald-300/20 bg-emerald-400/10 p-4"
              >
                <div className="font-black text-white">{item.title}</div>

                <div className="mt-2 text-sm leading-6 text-slate-300">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-[28px] border border-cyan-300/15 bg-cyan-400/[0.06] p-6">
          <div className="text-2xl font-black mb-5">פעולות מומלצות עכשיו</div>

          <div className="space-y-3">
            {brain.urgentActions.map((action, index) => (
              <div
                key={`${action}-${index}`}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="w-8 h-8 rounded-xl bg-cyan-300/15 text-cyan-200 flex items-center justify-center shrink-0 font-black">
                  ✓
                </div>

                <div className="text-slate-200 leading-7">{action}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-purple-300/15 bg-purple-400/[0.06] p-6">
          <div className="text-2xl font-black mb-5">פרופיל התנהגותי ראשוני</div>

          <div className="space-y-3">
            {brain.behavioralProfile.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-200 leading-7"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}