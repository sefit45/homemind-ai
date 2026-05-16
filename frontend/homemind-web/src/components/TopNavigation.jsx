import { useState } from "react";
import { answerFinancialQuestion } from "../services/aiQueryEngine";

export default function TopNavigation() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const askAI = () => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion) return;

    const result = answerFinancialQuestion(cleanQuestion);

    setAnswer(result);
    setIsOpen(true);
    setQuestion("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      askAI();
    }
  };

  return (
    <div className="mb-8 relative z-40">
      <div className="rounded-[28px] border border-cyan-500/10 bg-[#060b1f]/90 backdrop-blur-2xl px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-[820px] relative">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                type="text"
                placeholder="שאל את HomeMind משהו... למשל: כמה הוצאתי על מסעדות?"
                className="w-full rounded-2xl bg-black/20 border border-white/10 pr-14 pl-28 py-4 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/40 transition-all"
              />

              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500">
                🔎
              </div>

              <button
                onClick={askAI}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl bg-cyan-400 px-5 py-2 text-black font-black hover:bg-cyan-300 transition-all"
              >
                שאל
              </button>

              {isOpen && answer && (
                <div className="absolute top-[64px] right-0 left-0 rounded-[28px] border border-cyan-400/20 bg-[#07111f]/95 backdrop-blur-2xl p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="text-cyan-300 font-black">
                        HomeMind AI
                      </div>
                      <div className="text-slate-400 text-sm">
                        תשובה פיננסית מתוך מנוע העסקאות
                      </div>
                    </div>

                    <button
                      onClick={() => setIsOpen(false)}
                      className="rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/20 transition-all"
                    >
                      סגור
                    </button>
                  </div>

                  <div className="text-white leading-8 text-lg">
                    {answer}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setQuestion("מה הסטטוס הפיננסי שלי היום?");
                setTimeout(() => {
                  const result = answerFinancialQuestion(
                    "מה הסטטוס הפיננסי שלי היום?"
                  );
                  setAnswer(result);
                  setIsOpen(true);
                }, 0);
              }}
              className="bg-emerald-500/20 border border-emerald-400/20 text-emerald-300 px-5 py-3 rounded-2xl font-bold hover:bg-emerald-500/30 transition-all"
            >
              AI Live
            </button>

            <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-black font-black">
                ס
              </div>

              <div className="leading-tight">
                <div className="font-bold text-sm">ספי</div>
                <div className="text-slate-400 text-xs">Founder Mode</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}