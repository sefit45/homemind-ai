export default function DynamicInsightsPanel() {
  return (
    <div className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-black">
            AI Dynamic Insights
          </div>

          <div className="text-slate-400 text-sm">
            Real-time financial intelligence engine
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-cyan-500/10 text-cyan-300 text-sm">
          AI Live
        </div>
      </div>

      <div className="space-y-4">

        <div className="rounded-3xl border border-emerald-500/10 bg-emerald-500/10 p-5">
          <div className="text-emerald-300 font-bold mb-2">
            זיהוי מגמת שיפור
          </div>

          <div className="text-sm text-slate-300 leading-7">
            הוצאות המזון שלך ירדו ב־12% לעומת החודש הקודם.
          </div>
        </div>

        <div className="rounded-3xl border border-amber-500/10 bg-amber-500/10 p-5">
          <div className="text-amber-300 font-bold mb-2">
            חריגה אפשרית
          </div>

          <div className="text-sm text-slate-300 leading-7">
            זוהתה עלייה חריגה בקטגוריית קניות אונליין.
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-500/10 bg-cyan-500/10 p-5">
          <div className="text-cyan-300 font-bold mb-2">
            תחזית AI
          </div>

          <div className="text-sm text-slate-300 leading-7">
            בקצב הנוכחי, ההוצאות החודשיות צפויות להסתכם בכ־₪12,700.
          </div>
        </div>

      </div>
    </div>
  );
}