const assets = [
  {
    id: 1,
    category: "נדל״ן",
    icon: "🏠",
    items: [
      {
        name: "דירה בישראל",
        type: "נכס מגורים",
        country: "פתח תקווה, ישראל",
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
  {
    id: 4,
    category: "עו״ש בנקאי",
    icon: "💳",
    items: [
      {
        name: "עו״ש",
        type: "חשבון עובר ושב",
        country: "ישראל",
        value: "₪1,377",
        monthlyIncome: "₪0",
        debt: "₪0",
      },
    ],
  },
  {
    id: 5,
    category: "פיקדונות",
    icon: "🏦",
    items: [
      {
        name: "פיקדון דולרי",
        type: "USD Deposit",
        country: "ישראל",
        value: "₪98",
        monthlyIncome: "₪0",
        debt: "₪0",
      },
      {
        name: "פיקדון בנקאי ראשי",
        type: "פיקדון שקלי",
        country: "ישראל",
        value: "₪500,000",
        monthlyIncome: "₪0",
        debt: "₪0",
      },
    ],
  },
  {
    id: 6,
    category: "קרנות השתלמות",
    icon: "📈",
    items: [
      {
        name: "קרן השתלמות",
        type: "ספי + אפרת – מסלול מנייתי",
        country: "ישראל",
        value: "₪157,192",
        monthlyIncome: "₪0",
        debt: "₪0",
      },
    ],
  },
];

export default function AssetsHub() {
  return (
    <div className="space-y-4 mt-4">
      {assets.map((section) => (
        <div
          key={section.id}
          className="rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{section.icon}</span>

              <div>
                <div className="text-xl font-black text-white">
                  {section.category}
                </div>

                <div className="text-slate-400 text-xs">
                  {section.items.length} פריטים
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {section.items.map((asset, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-[#060B2A] p-4 hover:border-cyan-400/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-cyan-300 text-xs font-bold">
                      שווי
                    </div>

                    <div className="text-2xl font-black text-cyan-300 mt-1 leading-none">
                      {asset.value}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-white leading-tight">
                      {asset.name}
                    </div>

                    <div className="text-slate-400 text-sm mt-1">
                      {asset.type}
                    </div>

                    <div className="text-slate-500 text-xs mt-1">
                      {asset.country}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                    <div className="text-slate-400 text-[11px]">
                      הכנסה חודשית
                    </div>

                    <div className="text-emerald-400 font-black text-sm mt-1">
                      {asset.monthlyIncome}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                    <div className="text-slate-400 text-[11px]">
                      חוב
                    </div>

                    <div className="text-rose-300 font-black text-sm mt-1">
                      {asset.debt}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-3">
                  <button className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all">
                    ערך במקום
                  </button>

                  <button className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold hover:bg-rose-500/20 transition-all">
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
