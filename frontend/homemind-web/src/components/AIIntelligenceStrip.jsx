import { useEffect, useState } from "react";

const alerts = [
  {
    icon: "🧠",
    label: "AI Live",
    title: "HomeMind AI מנתח את התמונה הפיננסית שלך בזמן אמת",
    detail: "נכסים, תזרים, עסקאות, חריגות והזדמנויות נסרקים ברקע.",
    tone: "cyan",
  },
  {
    icon: "⚠️",
    label: "התראה חכמה",
    title: "זוהתה רגישות אפשרית בתזרים הקרוב",
    detail: "המערכת ממליצה לבדוק חיובים חוזרים והוצאות אשראי חריגות.",
    tone: "rose",
  },
  {
    icon: "📈",
    label: "מגמת הון",
    title: "מגמת השווי הנקי שלך ממשיכה להיבנות",
    detail: "ה־AI משווה בין נכסים, התחייבויות ותנועות אחרונות.",
    tone: "emerald",
  },
  {
    icon: "💳",
    label: "עסקאות",
    title: "מנוע המיפוי בודק כפילויות וקטגוריות",
    detail: "ייבוא עו״ש ואשראי עובר בדיקת אמינות לפני ניתוח.",
    tone: "blue",
  },
];

function getToneClasses(tone) {
  if (tone === "rose") return "border-rose-300/30 text-rose-200 bg-rose-400/10";
  if (tone === "emerald")
    return "border-emerald-300/30 text-emerald-200 bg-emerald-400/10";
  if (tone === "blue") return "border-blue-300/30 text-blue-200 bg-blue-400/10";

  return "border-cyan-300/30 text-cyan-200 bg-cyan-400/10";
}

export default function AIIntelligenceStrip() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % alerts.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const active = alerts[activeIndex];

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#06111f]/85 px-5 py-4 mb-7 shadow-[0_0_45px_rgba(34,211,238,0.10)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-gradient-to-l from-cyan-400/[0.10] via-transparent to-indigo-500/[0.08]" />
      <div className="absolute right-6 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-cyan-400/20 blur-[50px]" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-3xl bg-cyan-300 blur-[18px] opacity-30" />
            <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-300 via-blue-500 to-purple-600 flex items-center justify-center text-3xl shadow-[0_0_35px_rgba(34,211,238,0.35)]">
              {active.icon}
            </div>
          </div>

          <div className="min-w-0">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-black mb-2 ${getToneClasses(
                active.tone
              )}`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {active.label}
            </div>

            <div className="text-xl lg:text-2xl font-black truncate">
              {active.title}
            </div>

            <div className="text-slate-400 mt-1 text-sm lg:text-base truncate">
              {active.detail}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {alerts.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                activeIndex === index
                  ? "w-10 bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)]"
                  : "w-2.5 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`בחר התראה ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}