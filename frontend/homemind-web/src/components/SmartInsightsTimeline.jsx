import { analyzeSpendingAnomalies } from "../services/financialInsights";

export default function SmartInsightsTimeline() {
  const insights = analyzeSpendingAnomalies();

  const severityStyles = {
    positive: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    warning: "border-yellow-500/20 bg-yellow-500/10 text-yellow-100",
    danger: "border-rose-500/20 bg-rose-500/10 text-rose-100",
    info: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
  };

  return (
    <div className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-black">תובנות חריגות</div>
          <div className="text-slate-400 text-sm">
            AI Anomaly Detection Engine
          </div>
        </div>

        <div className="rounded-2xl bg-cyan-500/10 border border-cyan-400/20 px-4 py-2 text-cyan-300 text-sm font-bold">
          AI Live
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-3xl border p-5 transition-all hover:scale-[1.01] ${
              severityStyles[insight.severity] || severityStyles.info
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">{insight.icon}</div>
                  <div className="font-black text-lg">{insight.title}</div>
                </div>

                <div className="text-sm leading-7 opacity-90">
                  {insight.description}
                </div>
              </div>

              <div className="rounded-2xl bg-black/20 px-3 py-2 text-xs font-bold whitespace-nowrap">
                Anomaly
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}