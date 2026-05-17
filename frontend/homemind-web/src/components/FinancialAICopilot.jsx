import { useState } from "react";
import { askFinancialAi } from "../services/financialAiQueryEngine";

export default function FinancialAICopilot() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(
    "שלום ספי 👋 אני מחובר לנתוני התנועות שלך. אפשר לשאול אותי על הכנסות, הוצאות, קטגוריות, בתי עסק ותזרים."
  );

  const handleAsk = () => {
    if (!question.trim()) return;

    const result = askFinancialAi(question);
    setAnswer(result);
    setQuestion("");
  };

  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-7">
      <div className="flex items-start justify-between gap-5 mb-7">
        <div>
          <div className="text-3xl font-black">AI Copilot פיננסי</div>
          <div className="text-slate-400 mt-1">
            שאל שאלות אמיתיות על תנועות העו״ש והאשראי שלך
          </div>
        </div>

        <div className="rounded-2xl bg-cyan-400/10 border border-cyan-400/20 px-5 py-3 text-cyan-300 font-bold">
          AI Live
        </div>
      </div>

      <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-cyan-100 whitespace-pre-line leading-8 mb-5">
        {answer}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAsk();
          }}
          placeholder="לדוגמה: כמה הוצאתי במאי?"
          className="rounded-2xl bg-black/30 border border-white/10 px-5 py-4 text-white outline-none"
        />

        <button
          type="button"
          onClick={handleAsk}
          className="rounded-2xl bg-cyan-400 px-6 py-4 text-black font-black hover:bg-cyan-300 transition-all"
        >
          שאל
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        {[
          "כמה הוצאתי במאי?",
          "מה ההוצאה הכי גדולה?",
          "פירוט לפי קטגוריות",
          "מה בתי העסק המרכזיים?",
          "כמה נכנס לי?",
          "כמה הוצאתי על קריפטו?",
        ].map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setQuestion(sample);
              setAnswer(askFinancialAi(sample));
            }}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.1]"
          >
            {sample}
          </button>
        ))}
      </div>
    </section>
  );
}