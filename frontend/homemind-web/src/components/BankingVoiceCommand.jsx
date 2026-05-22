import { useState } from "react";
import {
  sendBankingCommand,
  openMizrahiBank,
} from "../services/bankingAgentClient";

export default function BankingVoiceCommand() {
  const [command, setCommand] = useState("");
  const [status, setStatus] = useState("");
  const [isListening, setIsListening] = useState(false);

  const speak = (text) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const formatNumbersForSpeech = (value) => {
      return String(value).replace(
        /-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g,
        (num) => {
          const isNegative = num.startsWith("-");
          const clean = num.replace(/-/g, "").replace(/,/g, "");
          const rounded = Math.round(Number(clean));

          if (Number.isNaN(rounded)) return num;

          return `${isNegative ? "מינוס " : ""}${rounded.toLocaleString(
            "he-IL"
          )}`;
        }
      );
    };

    const cleanText = formatNumbersForSpeech(text)
      .replace(/₪/g, " שקלים ")
      .replace(/עו״ש/g, "עובר ושב")
      .replace(/Snapshot/g, "תמונת מצב")
      .replace(/HomeMind/g, "הום מיינד")
      .replace(/AI/g, "איי איי")
      .replace(/\./g, ". ")
      .replace(/,/g, ", ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();

    const hebrewVoice =
      voices.find((voice) => voice.lang === "he-IL") ||
      voices.find((voice) => voice.lang?.startsWith("he")) ||
      voices.find((voice) =>
        voice.name?.toLowerCase().includes("hebrew")
      );

    if (hebrewVoice) {
      utterance.voice = hebrewVoice;
    }

    utterance.lang = "he-IL";
    utterance.rate = 0.82;
    utterance.pitch = 1.02;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };

  const runCommand = async (textFromVoice = "") => {
    const finalCommand = textFromVoice || command;

    if (!finalCommand.trim()) return;

    setStatus("מבצע פקודה...");

    try {
      const result = await sendBankingCommand(finalCommand);
      const message = result.message || "הפקודה נשלחה";
      setStatus(message);
      speak(message);
    } catch {
      const message = "לא הצלחתי להתחבר ל־Banking Agent. ודא שהוא רץ.";
      setStatus(message);
      speak(message);
    }
  };

  const openMizrahi = async () => {
    setStatus("פותח את מזרחי...");

    try {
      const result = await openMizrahiBank();
      const message = result.message || "מזרחי נפתח";
      setStatus(message);
      speak(message);
    } catch {
      const message = "לא הצלחתי לפתוח את מזרחי. ודא שה־Agent רץ.";
      setStatus(message);
      speak(message);
    }
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("הדפדפן לא תומך בזיהוי קול");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "he-IL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("מאזין לפקודה...");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);
      setIsListening(false);
      setStatus("לא הצלחתי לזהות קול. נסה שוב.");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setCommand(transcript);
      setStatus(`זוהתה פקודה: ${transcript}`);
      runCommand(transcript);
    };

    recognition.start();
  };

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4 mb-5">
      <div className="font-black text-xl mb-2">פקודות בנק חכמות</div>

      <div className="text-slate-400 text-sm mb-4">
        מצב בטוח: פתיחה וניווט בלבד. התחברות מתבצעת ידנית על ידך.
      </div>

      <div className="flex flex-col xl:flex-row gap-3">
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="לדוגמה: תתחבר למזרחי"
          className="flex-1 rounded-2xl bg-black/30 border border-white/10 px-4 py-3 outline-none text-white"
        />

        <button
          onClick={startVoiceRecognition}
          className={`rounded-2xl font-black px-5 py-3 transition-all ${
            isListening
              ? "bg-rose-500 text-white animate-pulse"
              : "bg-cyan-400 text-black hover:bg-cyan-300"
          }`}
        >
          {isListening ? "מאזין..." : "🎤 דבר"}
        </button>

        <button
          onClick={() => runCommand()}
          className="rounded-2xl bg-cyan-400 text-black font-black px-5 py-3"
        >
          בצע
        </button>

        <button
          onClick={openMizrahi}
          className="rounded-2xl bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 font-black px-5 py-3"
        >
          פתח מזרחי
        </button>
      </div>

      {status && (
        <div className="mt-3 rounded-xl bg-black/20 border border-white/10 px-4 py-2 text-sm text-cyan-100">
          {status}
        </div>
      )}
    </section>
  );
}
