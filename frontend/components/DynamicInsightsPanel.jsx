import { generateDynamicInsights } from "../services/dynamicInsightsEngine";

export default function DynamicInsightsPanel() {
  const insights = generateDynamicInsights();

  const toneStyles = {
    positive: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    warning: "border-yellow-500/20 bg-yellow-500/10 text-yellow-100",
    danger: "border-rose-500/20 bg-rose-500/10 text-rose-100",
    neutral: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
  };

  return (
    <div className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-black">AI Financial Insights</div>

          <div className="text-slate-400 text-sm">
            Dynamic Intelligence Engine
          </div>
        </div>

        <div className="rounded-2xl bg-cyan-500/10 border border-cyan-400/20 px-4 py-2 text-cyan-300 text-sm font-bold">
          AI Insights
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-3xl border p-5 transition-all hover:scale-[1.01] ${
              toneStyles[insight.tone] || toneStyles.neutral
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{insight.icon}</div>

              <div className="flex-1">
                <div className="font-black text-lg mb-2">
                  {insight.title}
                </div>

                <div className="text-sm leading-7 opacity-90">
                  {insight.description}
                </div>
              </div>

              <div className="rounded-2xl bg-black/20 px-3 py-2 text-xs font-bold whitespace-nowrap">
                Smart AI
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}