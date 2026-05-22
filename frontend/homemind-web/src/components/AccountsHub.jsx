const assets = [
  {
    id: 1,
    category: "נדל״ן",
    icon: "🏠",
    items: [
      {
        name: "דירה בישראל",
        type: "נכס מגורים",
        country: "ישראל",
        value: "₪3,605,787",
        monthlyIncome: "₪0",
        debt: "₪0",
      },
      {
        name: "דירת בודפשט",
        type: "Dob utca 49, Budapest",
        country: "Budapest, Hungary",
        value: "₪688,474",
        monthlyIncome: "₪3,000",
        debt: "₪0",
      },
    ],
  },
  {
    id: 2,
    category: "רכבים",
    icon: "🚗",
    items: [
      {
        name: "BMW X3 2014",
        type: "רכב עירוני",
        country: "ישראל",
        value: "₪60,000",
        monthlyIncome: "₪0",
        debt: "₪0",
      },
      {
        name: "רכב משפחתי – סוזוקי קרוסאובר 2017",
        type: "SUV",
        country: "ישראל",
        value: "₪48,000",
        monthlyIncome: "₪0",
        debt: "₪0",
      },
    ],
  },
  {
    id: 3,
    category: "קריפטו",
    icon: "🪙",
    items: [
      {
        name: "ביטס אוף גולד",
        type: "BTC",
        country: "ישראל",
        value: "₪33,155",
        monthlyIncome: "₪0",
        debt: "₪0",
      },
    ],
  },
];

export default function AssetsHub() {
  return (
    <div className="space-y-8 mt-8">
      {assets.map((section) => (
        <div
          key={section.id}
          className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{section.icon}</span>

              <div>
                <div className="text-2xl font-black text-white">
                  {section.category}
                </div>

                <div className="text-slate-400 text-sm">
                  {section.items.length} פריטים
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {section.items.map((asset, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-[#060B2A] p-4 hover:border-cyan-400/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-cyan-300 text-sm font-bold">
                      שווי
                    </div>

                    <div className="text-3xl font-black text-cyan-300 mt-1">
                      {asset.value}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-white leading-tight">
                      {asset.name}
                    </div>

                    <div className="text-slate-400 text-sm mt-1">
                      {asset.type}
                    </div>

                    <div className="text-slate-500 text-sm mt-1">
                      {asset.country}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-xl bg-white/[0.04] p-2">
                    <div className="text-slate-400 text-xs">
                      הכנסה חודשית
                    </div>

                    <div className="text-emerald-400 font-black text-sm mt-1">
                      {asset.monthlyIncome}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/[0.04] p-2">
                    <div className="text-slate-400 text-xs">
                      חוב
                    </div>

                    <div className="text-rose-300 font-black text-sm mt-1">
                      {asset.debt}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4">
                  <button className="px-3 py-2 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all">
                    ערך במקום
                  </button>

                  <button className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-bold hover:bg-rose-500/20 transition-all">
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
