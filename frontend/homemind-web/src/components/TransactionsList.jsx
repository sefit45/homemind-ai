function formatCurrency(value) {
  const absValue = Math.abs(value).toLocaleString('he-IL');

  if (value < 0) {
    return `-₪${absValue}`;
  }

  return `+₪${absValue}`;
}

function getCategoryIcon(category) {
  const icons = {
    'מזון וסופר': '🛒',
    'מנויים וטכנולוגיה': '🤖',
    'בילויים ומסעדות': '🍽️',
    'קריפטו והשקעות': '🪙',
    הכנסה: '💼',
  };

  return icons[category] || '💳';
}

export default function TransactionsList({ transactions = [] }) {
  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-black">עסקאות אחרונות</div>
          <div className="text-slate-400 mt-1">Transactions Engine</div>
        </div>

        <button className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm hover:bg-white/10 transition-all">
          הצג הכל
        </button>
      </div>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="group grid grid-cols-[1fr_auto] gap-4 rounded-3xl border border-white/10 bg-[#07111F]/70 p-4 hover:bg-white/[0.07] hover:border-cyan-400/30 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                {getCategoryIcon(tx.category)}
              </div>

              <div>
                <div className="font-black text-lg">{tx.merchant}</div>

                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                  <span>{tx.category}</span>
                  <span>•</span>
                  <span>{tx.date}</span>

                  {tx.recurring && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-300 font-bold">חוזר</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`text-xl font-black flex items-center ${
                tx.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {formatCurrency(tx.amount)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}