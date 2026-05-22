import { useEffect, useRef } from "react";

export default function LiveHumanAdvisor() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.currentTime = 0;

    video.play().catch(() => {
      console.log("Autoplay blocked by browser");
    });
  }, []);

  const replayWithSound = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;

    await video.play();
  };

  return (
    <div className="relative w-full overflow-hidden rounded-[44px] border border-cyan-500/20 bg-[#020617] shadow-[0_0_90px_rgba(34,211,238,0.12)]">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/20" />
      <div className="absolute right-0 top-0 h-full w-[65%] bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[0.55fr_1.45fr] min-h-[780px]">
        <div className="p-12 xl:p-16 flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-cyan-300 text-sm font-bold mb-8">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            HomeMind Live AI Advisor
          </div>

          <h1 className="text-5xl xl:text-7xl font-black leading-tight text-white mb-8">
            היועץ הפיננסי
            <br />
            האישי שלך
          </h1>

          <p className="text-xl xl:text-2xl text-slate-300 leading-relaxed max-w-2xl mb-10">
            אנושי בזמן אמת עם קול, וידאו ותובנות פיננסיות מותאמות אישית.
          </p>

          <div className="space-y-5 mb-12">
            {[
              "מדבר בעברית טבעית",
              "מנתח הוצאות בזמן אמת",
              "מציג תובנות פיננסיות חכמות",
              "חוויית AI קולנועית מלאה",
            ].map((item) => (
              <div key={item} className="flex items-center gap-4 text-slate-200 text-lg">
                <div className="h-3 w-3 rounded-full bg-cyan-400" />
                {item}
              </div>
            ))}
          </div>

          <button
            onClick={replayWithSound}
            className="w-fit rounded-2xl bg-cyan-400 px-10 py-5 text-black font-black text-lg hover:scale-105 transition-all"
          >
            הפעל שוב עם קול
          </button>
        </div>

        <div className="relative flex items-center justify-center p-8 xl:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.28),transparent_55%)]" />

          <div className="relative w-full max-w-[1000px] h-[700px]">
            <div className="absolute inset-0 rounded-[44px] bg-cyan-400/25 blur-3xl scale-105 animate-pulse" />

            <video
              ref={videoRef}
              src="/avatar/advisor.mp4"
              className="relative z-10 w-full h-full object-cover rounded-[44px] border border-cyan-400/30 shadow-[0_0_90px_rgba(34,211,238,0.28)] bg-black"
              playsInline
              controls
              preload="auto"
            />

            <div className="absolute right-6 top-6 z-20 max-w-[320px] rounded-3xl border border-cyan-400/20 bg-[#07111f]/90 backdrop-blur-xl p-6 shadow-2xl">
              <div className="text-cyan-300 text-sm mb-2 font-bold">HomeMind AI</div>
              <div className="text-white text-lg leading-relaxed">
                בוקר טוב ספי 👋
                <br />
                זיהיתי חריגה בהוצאות החודש.
                <br />
                רוצה שאעבור איתך על זה?
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
