const activities = [
  {
    id: 1,
    title: "סנכרון חשבונות הושלם",
    description: "בנק הפועלים, MAX ו־Binance עודכנו בהצלחה.",
    time: "לפני 2 דקות",
    icon: "🟢",
    tone: "success",
  },
  {
    id: 2,
    title: "עסקה סווגה אוטומטית",
    description: "OpenAI סווג תחת מנויים וטכנולוגיה.",
    time: "לפני 8 דקות",
    icon: "🤖",
    tone: "ai",
  },
  {
    id: 3,
    title: "משכורת זוהתה",
    description: "נכנסה הכנסה חדשה בסך ₪52,000.",
    time: "היום",
    icon: "💼",
    tone: "income",
  },
  {
    id: 4,
    title: "שינוי ברמת סיכון",
    description: "חשיפת הקריפטו עלתה ביחס לחודש קודם.",
    time: "היום",
    icon: "⚠️",
    tone: "risk",
  },
  {
    id: 5,
    title: "תשלום צפוי",
    description: "חיוב אשראי MAX צפוי לרדת בעוד 4 ימים.",
    time: "תחזית",
    icon: "📅",
    tone: "neutral",
  },
];

function getToneClasses(tone) {
  const tones = {
    success: "border-emerald-400/20 bg-emerald-400/8",
    ai: "border-cyan-400/20 bg-cyan-400/8",
    income: "border-blue-400/20 bg-blue-400/8",
    risk: "border-amber-400/20 bg-amber-400/8",
    neutral: "border-white/10 bg-white/[0.04]",
  };

  return tones[tone] || tones.neutral;
}

export default function LiveActivityFeed() {
  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="text-3xl font-black text-white">
            Live Activity
          </div>
          <div className="text-slate-400 text-sm mt-1">
            Real-time financial operating log
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/20 px-4 py-3 text-emerald-300 font-bold">
          Live
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`rounded-3xl border p-5 hover:bg-white/[0.07] transition-all duration-300 ${getToneClasses(
              activity.tone
            )}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl">
                  {activity.icon}
                </div>

                <div>
                  <div className="text-white font-black text-lg">
                    {activity.title}
                  </div>
                  <div className="text-slate-400 text-sm leading-6 mt-1">
                    {activity.description}
                  </div>
                </div>
              </div>

              <div className="text-slate-500 text-sm whitespace-nowrap">
                {activity.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}