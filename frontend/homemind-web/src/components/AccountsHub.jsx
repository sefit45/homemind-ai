const accounts = [
  {
    id: 1,
    name: "בנק הפועלים",
    subtitle: "עו״ש ראשי · עודכן לפני 2 דקות",
    balance: "₪84,200",
    status: "Sync תקין",
    score: "98 AI Score",
    icon: "🏦",
    tone: "cyan",
  },
  {
    id: 2,
    name: "MAX",
    subtitle: "כרטיס אשראי ראשי",
    balance: "₪12,480-",
    status: "חריגה גבוהה",
    score: "71 AI Score",
    icon: "💳",
    tone: "violet",
  },
  {
    id: 3,
    name: "Binance",
    subtitle: "Crypto Portfolio",
    balance: "₪214,000",
    status: "+12.4%",
    score: "AI Bullish",
    icon: "₿",
    tone: "amber",
  },
  {
    id: 4,
    name: "קרן פנסיה",
    subtitle: "מנורה מבטחים",
    balance: "₪1.2M",
    status: "מסלול אגרסיבי",
    score: "Long Term",
    icon: "📈",
    tone: "emerald",
  },
];

function getCardClasses(tone) {
  const tones = {
    cyan: "from-cyan-500/10 to-blue-500/10",
    violet: "from-violet-500/10 to-fuchsia-500/10",
    amber: "from-amber-500/10 to-orange-500/10",
    emerald: "from-emerald-500/10 to-cyan-500/10",
  };

  return tones[tone] || "from-white/5 to-white/5";
}

function getStatusColor(tone) {
  const tones = {
    cyan: "text-emerald-400",
    violet: "text-amber-400",
    amber: "text-emerald-400",
    emerald: "text-cyan-400",
  };

  return tones[tone] || "text-slate-300";
}

export default function AccountsHub() {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-10">
      <div className="xl:col-span-2 rounded-[34px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-7">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-3xl font-black text-white">
              Accounts Hub
            </div>
            <div className="text-slate-400 text-sm mt-1">
              Smart Financial Connections
            </div>
          </div>

          <button className="px-5 py-3 rounded-2xl bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition-all">
            חבר חשבון
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`rounded-3xl border border-white/10 bg-gradient-to-br ${getCardClasses(
                account.tone
              )} p-5 hover:border-cyan-400/30 transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-black text-xl">
                    {account.name}
                  </div>
                  <div className="text-slate-400 text-sm mt-1">
                    {account.subtitle}
                  </div>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
                  {account.icon}
                </div>
              </div>

              <div className="mt-6 text-4xl font-black text-white">
                {account.balance}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className={`font-bold ${getStatusColor(account.tone)}`}>
                  {account.status}
                </div>

                <div className="text-slate-400 text-sm">
                  {account.score}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[34px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-7">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-white">
              AI Risk Monitor
            </div>

            <div className="text-slate-400 text-sm mt-1">
              Real Time Financial Signals
            </div>
          </div>

          <div className="w-14 h-14 rounded-3xl bg-red-500/20 flex items-center justify-center text-2xl">
            🚨
          </div>
        </div>

        <div className="space-y-4 mt-8">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="text-red-300 font-black">
              שימוש חריג באשראי
            </div>
            <div className="text-slate-300 text-sm mt-2 leading-7">
              ההוצאות בכרטיס MAX עלו ב־28% לעומת החודש הקודם.
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4">
            <div className="text-cyan-300 font-black">
              AI Opportunity
            </div>
            <div className="text-slate-300 text-sm mt-2 leading-7">
              זוהתה יתרת מזומן גבוהה. ניתן להעביר ₪40K להשקעה סולידית.
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="text-emerald-300 font-black">
              Financial Health
            </div>
            <div className="text-slate-300 text-sm mt-2 leading-7">
              מצבך הפיננסי יציב. יחס ההתחייבויות תקין.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}