import { useState } from "react";
import { answerFinancialQuestion } from "../services/aiQueryEngine";
import { askAIAdvisor } from "../services/aiAdvisorEngine";

const starterMessages = [
  {
    role: "assistant",
    content:
      "שלום ספי 👋 אני מחובר לנתוני העסקאות ששמרת. אפשר לשאול אותי: כמה הוצאתי על אוכל ביוני? וגם: למה יוני היה יקר?",
  },
];

function shouldUseAdvisor(question) {
  const text = String(question || "").toLowerCase();

  return (
    text.includes("למה") ||
    text.includes("מדוע") ||
    text.includes("איך") ||
    text.includes("לחסוך") ||
    text.includes("חיסכון") ||
    text.includes("הכי יקר") ||
    text.includes("יקר") ||
    text.includes("מה השתנה") ||
    text.includes("שינוי") ||
    text.includes("המלצה") ||
    text.includes("כדאי") ||
    text.includes("ניתוח") ||
    text.includes("איפה אני מבזבז") ||
    text.includes("בית העסק") ||
    text.includes("חריג")
  );
}

function updateConversationMemory(question, currentMemory) {
  const text = String(question || "").toLowerCase();

  const nextMemory = {
    ...currentMemory,
  };

  if (text.includes("ינואר")) nextMemory.lastMonth = "ינואר 2026";
  if (text.includes("פברואר")) nextMemory.lastMonth = "פברואר 2026";
  if (text.includes("מרץ")) nextMemory.lastMonth = "מרץ 2026";
  if (text.includes("אפריל")) nextMemory.lastMonth = "אפריל 2026";
  if (text.includes("מאי")) nextMemory.lastMonth = "מאי 2026";
  if (text.includes("יוני")) nextMemory.lastMonth = "יוני 2026";
  if (text.includes("יולי")) nextMemory.lastMonth = "יולי 2026";
  if (text.includes("אוגוסט")) nextMemory.lastMonth = "אוגוסט 2026";
  if (text.includes("ספטמבר")) nextMemory.lastMonth = "ספטמבר 2026";
  if (text.includes("אוקטובר")) nextMemory.lastMonth = "אוקטובר 2026";
  if (text.includes("נובמבר")) nextMemory.lastMonth = "נובמבר 2026";
  if (text.includes("דצמבר")) nextMemory.lastMonth = "דצמבר 2026";

  if (
    text.includes("אוכל") ||
    text.includes("מזון") ||
    text.includes("סופר") ||
    text.includes("צריכה")
  ) {
    nextMemory.lastCategory = "מזון וצריכה";
  }

  if (
    text.includes("מסעד") ||
    text.includes("קפה") ||
    text.includes("וולט") ||
    text.includes("wolt")
  ) {
    nextMemory.lastCategory = "מסעדות ובתי קפה";
  }

  if (
    text.includes("דלק") ||
    text.includes("רכב") ||
    text.includes("תחבורה")
  ) {
    nextMemory.lastCategory = "תחבורה ודלק";
  }

  if (
    text.includes("פארם") ||
    text.includes("קוסמטיקה")
  ) {
    nextMemory.lastCategory = "פארם וקוסמטיקה";
  }

  if (
    text.includes("רפואה") ||
    text.includes("תרופות") ||
    text.includes("בית מרקחת")
  ) {
    nextMemory.lastCategory = "רפואה ובתי מרקחת";
  }

  if (
    text.includes("חשמל") ||
    text.includes("תקשורת") ||
    text.includes("סלולר")
  ) {
    nextMemory.lastCategory = "חשמל ותקשורת";
  }

  if (
    text.includes("קריפטו") ||
    text.includes("השקעות") ||
    text.includes("פיננסים") ||
    text.includes("binance")
  ) {
    nextMemory.lastCategory = "השקעות ופיננסים";
  }

  return nextMemory;
}

export default function AICopilotPanel() {
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const [conversationMemory, setConversationMemory] = useState({
    lastMonth: null,
    lastCategory: null,
    lastMerchant: null,
  });

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;

    let question = input.trim();

    const lower = question.toLowerCase();

    if (
    (lower === "למה" ||
        lower.includes("איך אפשר לחסוך") ||
        lower.includes("ומה לגבי")) &&
    conversationMemory.lastMonth
    ) {
    question = `${question} לגבי ${conversationMemory.lastMonth}`;
    }

    const nextMemory = updateConversationMemory(
    question,
    conversationMemory
    );

    setConversationMemory(nextMemory);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setIsThinking(true);

    try {
      const answer = shouldUseAdvisor(question)
        ? await askAIAdvisor(question, nextMemory)
        : answerFinancialQuestion(question, nextMemory);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "אירעה שגיאה בניתוח הנתונים. נסה שוב או בדוק שהועלו קבצי עסקאות.",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="rounded-[34px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-black">AI Copilot</div>
          <div className="text-slate-400 text-sm">
            Financial Query + Advisor Engine
          </div>
        </div>

        <div className="h-14 w-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-2xl">
          🤖
        </div>
      </div>

      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-2xl p-4 text-sm leading-7 ${
              message.role === "assistant"
                ? "bg-cyan-500/10 border border-cyan-400/10 text-cyan-100"
                : "bg-white/5 border border-white/5 text-white"
            }`}
          >
            {message.content}
          </div>
        ))}

        {isThinking && (
          <div className="rounded-2xl p-4 text-sm leading-7 bg-cyan-500/10 border border-cyan-400/10 text-cyan-100">
            מנתח את הנתונים הפיננסיים שלך...
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="שאל: כמה הוצאתי על אוכל ביוני? ומה לגבי מאי?"
          className="flex-1 rounded-2xl bg-black/20 border border-white/10 px-5 py-4 outline-none text-white placeholder:text-slate-500"
        />

        <button
          onClick={sendMessage}
          disabled={isThinking}
          className="rounded-2xl bg-cyan-500 hover:bg-cyan-400 transition-all px-6 font-bold disabled:opacity-50"
        >
          {isThinking ? "חושב..." : "שלח"}
        </button>
      </div>
    </div>
  );
}
