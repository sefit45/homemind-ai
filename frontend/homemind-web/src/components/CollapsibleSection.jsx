import { useState } from "react";

export default function CollapsibleSection({
  title,
  subtitle = "",
  badge = "",
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mt-10 rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-5 p-7 text-right hover:bg-white/[0.03] transition-all"
      >
        <div>
          <div className="text-3xl font-black text-white">{title}</div>

          {subtitle && (
            <div className="text-slate-400 text-sm mt-1">{subtitle}</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {badge && (
            <div className="rounded-2xl bg-cyan-400/10 border border-cyan-400/20 px-4 py-2 text-cyan-300 font-bold">
              {badge}
            </div>
          )}

          <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-white font-black">
            {open ? "סגור ▲" : "פתח ▼"}
          </div>
        </div>
      </button>

      {open && <div className="px-7 pb-7">{children}</div>}
    </section>
  );
}