import { useEffect, useState } from "react";
import { generateDailyBriefing } from "../services/dailyBriefingEngine";

export default function LiveAdvisorAvatar() {
  const [isOpen, setIsOpen] = useState(false);
  const [briefing, setBriefing] = useState("");

  useEffect(() => {
    const text = generateDailyBriefing();
    setBriefing(text);
  }, []);

  function speak(text) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "he-IL";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const hebrewVoice =
      voices.find((v) => v.lang.includes("he")) || voices[0];

    if (hebrewVoice) {
      utterance.voice = hebrewVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  function openAdvisor() {
    setIsOpen(true);

    setTimeout(() => {
      speak(briefing);
    }, 600);
  }

  return (
    <>
      <button
        onClick={openAdvisor}
        className="hidden xl:flex fixed right-[calc(100vw-360px)] top-[170px] z-30 h-[680px] w-[120px] items-end justify-center rounded-[48px] border border-cyan-400/10 bg-cyan-400/[0.03] hover:bg-cyan-400/[0.07] transition-all"
        title="פתח יועץ AI חי"
      >
        <div className="relative h-[620px] w-[96px]">
          <div className="absolute inset-x-0 top-4 mx-auto h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl animate-pulse" />

          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full border border-cyan-300/30 bg-gradient-to-b from-cyan-300/30 to-blue-500/20 shadow-2xl shadow-cyan-500/20 flex items-center justify-center text-5xl animate-pulse">
            🤖
          </div>

          <div className="absolute top-[92px] left-1/2 -translate-x-1/2 h-[360px] w-[54px] rounded-full border border-cyan-300/20 bg-gradient-to-b from-cyan-300/20 via-blue-500/10 to-purple-500/10 shadow-xl shadow-cyan-500/10" />

          <div className="absolute top-[160px] left-[12px] h-[240px] w-[18px] rounded-full rotate-[10deg] bg-cyan-300/20 border border-cyan-300/20" />
          <div className="absolute top-[160px] right-[12px] h-[240px] w-[18px] rounded-full rotate-[-10deg] bg-cyan-300/20 border border-cyan-300/20" />

          <div className="absolute bottom-[60px] left-[22px] h-[190px] w-[18px] rounded-full bg-blue-300/20 border border-cyan-300/20" />
          <div className="absolute bottom-[60px] right-[22px] h-[190px] w-[18px] rounded-full bg-blue-300/20 border border-cyan-300/20" />

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-2xl bg-black/40 border border-cyan-400/20 px-3 py-2 text-[11px] text-cyan-200 font-bold whitespace-nowrap">
            Live Advisor
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="relative w-full max-w-6xl min-h-[760px] rounded-[44px] border border-white/10 bg-[#061020] shadow-2xl overflow-hidden">
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                setIsOpen(false);
              }}
              className="absolute top-6 left-6 z-10 rounded-2xl bg-white/10 hover:bg-white/20 px-5 py-3 text-white font-bold"
            >
              סגור
            </button>

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(6,182,212,0.22),transparent_38%),radial-gradient(circle_at_30%_70%,rgba(99,102,241,0.22),transparent_35%)]" />

            <div className="relative grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 p-10 min-h-[760px]">
              <div className="flex flex-col justify-between">
                <div>
                  <div className="inline-flex rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-cyan-300 font-bold mb-6">
                    HomeMind Live Advisor
                  </div>

                  <h1 className="text-5xl font-black text-white leading-tight">
                    היועץ הפיננסי החי שלך
                  </h1>

                  <p className="text-slate-300 text-lg leading-8 mt-5 max-w-2xl">
                    אווטאר פיננסי חכם עם קול, תובנות בזמן אמת ו־AI Briefing אישי.
                  </p>

                  <div className="mt-8 rounded-[32px] border border-cyan-400/10 bg-cyan-400/10 p-7 text-cyan-100 text-lg leading-9">
                    {briefing}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                  <button
                    onClick={() => speak(briefing)}
                    className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-cyan-200 font-bold hover:bg-cyan-400/20 transition-all"
                  >
                    🎙️ דבר איתי
                  </button>

                  <button className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-emerald-200 font-bold">
                    💡 תן תובנה
                  </button>

                  <button className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-amber-200 font-bold">
                    📊 נתח חודש
                  </button>
                </div>
              </div>

              <div className="relative flex items-end justify-center">
                <div className="absolute bottom-8 h-[520px] w-[260px] rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />

                <div className="relative h-[650px] w-[300px]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-36 w-36 rounded-full border border-cyan-300/40 bg-gradient-to-b from-cyan-300/30 to-blue-500/20 shadow-2xl shadow-cyan-500/30 flex items-center justify-center text-7xl animate-pulse">
                    🤖
                  </div>

                  <div className="absolute top-[138px] left-1/2 -translate-x-1/2 h-[330px] w-[115px] rounded-[70px] border border-cyan-300/30 bg-gradient-to-b from-cyan-300/20 via-blue-500/10 to-purple-500/10 shadow-xl shadow-cyan-500/20" />

                  <div className="absolute top-[190px] left-[42px] h-[280px] w-[34px] rounded-full rotate-[12deg] bg-cyan-300/20 border border-cyan-300/20" />
                  <div className="absolute top-[190px] right-[42px] h-[280px] w-[34px] rounded-full rotate-[-12deg] bg-cyan-300/20 border border-cyan-300/20" />

                  <div className="absolute bottom-[20px] left-[92px] h-[230px] w-[36px] rounded-full bg-blue-300/20 border border-cyan-300/20" />
                  <div className="absolute bottom-[20px] right-[92px] h-[230px] w-[36px] rounded-full bg-blue-300/20 border border-cyan-300/20" />

                  <div className="absolute top-[80px] right-0 rounded-3xl border border-white/10 bg-black/40 p-4 text-cyan-100 text-sm leading-7 w-[240px]">
                    {briefing}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}