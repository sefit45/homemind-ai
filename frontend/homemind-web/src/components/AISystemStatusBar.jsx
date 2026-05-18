const systems = [
  {
    label: "AI CORE",
    status: "ONLINE",
    color: "cyan",
  },
  {
    label: "MARKET FEED",
    status: "ACTIVE",
    color: "emerald",
  },
  {
    label: "ASSET ENGINE",
    status: "SYNCED",
    color: "blue",
  },
  {
    label: "CASHFLOW",
    status: "MONITORING",
    color: "purple",
  },
  {
    label: "RISK ENGINE",
    status: "RUNNING",
    color: "rose",
  },
];

function getGlow(color) {
  if (color === "emerald") {
    return "bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,1)]";
  }

  if (color === "blue") {
    return "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,1)]";
  }

  if (color === "purple") {
    return "bg-purple-400 shadow-[0_0_18px_rgba(192,132,252,1)]";
  }

  if (color === "rose") {
    return "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,1)]";
  }

  return "bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,1)]";
}

export default function AISystemStatusBar() {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-cyan-300/15 bg-[#07111d]/85 px-5 py-4 mb-7 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-gradient-to-l from-cyan-400/[0.08] via-transparent to-indigo-500/[0.08]" />

      <div className="relative z-10 flex flex-wrap items-center gap-4">
        {systems.map((system) => (
          <div
            key={system.label}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
          >
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${getGlow(
                system.color
              )}`}
            />

            <div>
              <div className="text-[11px] tracking-[0.18em] text-slate-400 font-black">
                {system.label}
              </div>

              <div className="font-black text-sm mt-1">
                {system.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}