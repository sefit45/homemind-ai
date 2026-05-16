import { generateHistoricalMemories } from "../services/historicalMemoryEngine";

export default function HistoricalMemoryPanel() {
  const memories = generateHistoricalMemories();

  const typeStyles = {
    positive: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    danger: "border-rose-500/20 bg-rose-500/10 text-rose-100",
    info: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
  };

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="text-3xl font-black text-white">
            Financial Memory
          </div>

          <div className="text-slate-400 text-sm mt-1">
            זיכרון פיננסי חכם שמזהה דפוסים לאורך זמן
          </div>
        </div>

        <div className="rounded-2xl bg-cyan-400/10 border border-cyan-400/20 px-4 py-3 text-cyan-300 font-bold">
          AI Memory
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {memories.map((memory) => (
          <div
            key={memory.id}
            className={`rounded-3xl border p-5 transition-all hover:scale-[1.01] ${
              typeStyles[memory.type] || typeStyles.info
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{memory.icon}</div>

              <div className="flex-1">
                <div className="font-black text-xl">
                  {memory.title}
                </div>

                <div className="text-sm leading-7 mt-2 opacity-90">
                  {memory.description}
                </div>
              </div>

              <div className="rounded-2xl bg-black/20 px-3 py-2 text-xs font-bold whitespace-nowrap">
                Memory
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}