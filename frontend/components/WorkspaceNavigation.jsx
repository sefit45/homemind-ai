const WORKSPACES = [
  {
    id: "ai",
    title: "מרכז AI",
    subtitle: "Copilot, אימון, זיכרון ותובנות",
    icon: "🧠",
  },
  {
    id: "banking",
    title: "מרכז בנקאות",
    subtitle: "עו״ש, אשראי, ייבוא ותנועות",
    icon: "💳",
  },
  {
    id: "analytics",
    title: "מרכז אנליטיקה",
    subtitle: "מגמות, קטגוריות והשוואות",
    icon: "📊",
  },
  {
    id: "wealth",
    title: "מרכז נכסים",
    subtitle: "נדל״ן, קריפטו, רכבים והשקעות",
    icon: "💎",
  },
];

export default function WorkspaceNavigation({ activeWorkspace, onChange }) {
  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {WORKSPACES.map((workspace) => {
          const isActive = activeWorkspace === workspace.id;

          return (
            <button
              key={workspace.id}
              type="button"
              onClick={() => onChange(workspace.id)}
              className={[
                "text-right rounded-3xl border p-5 transition-all",
                isActive
                  ? "bg-cyan-400/15 border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.16)]"
                  : "bg-[#07111F]/70 border-white/10 hover:bg-white/[0.06]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-3xl">{workspace.icon}</div>

                <div>
                  <div
                    className={[
                      "text-xl font-black",
                      isActive ? "text-cyan-200" : "text-white",
                    ].join(" ")}
                  >
                    {workspace.title}
                  </div>

                  <div className="text-slate-400 text-sm mt-1">
                    {workspace.subtitle}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}