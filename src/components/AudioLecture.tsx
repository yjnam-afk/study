"use client";

import { useEffect, useRef, useState } from "react";
import { edgeSynthesizeTurnsBrowser } from "@/lib/edgeTtsClient";

/**
 * 🎧 오디오 강의 — NotebookLM 오디오 오버뷰 스타일.
 * 1) AI가 진행자/전문가 팟캐스트 대본을 생성(/api/audio-script)
 * 2) Gemini 멀티스피커 신경망 TTS로 "두 명의 진짜 목소리" mp3 합성(/api/tts)
 * 3) mp3 재생. 신경망 TTS 실패(한도 등) 시에만 브라우저 TTS로 폴백.
 */

type Turn = { speaker: "진행자" | "전문가"; text: string };

function parseScript(raw: string): Turn[] {
  const turns: Turn[] = [];
  for (const line of raw.split("\n")) {
    const m = line.trim().match(/^(진행자|전문가)\s*[:：]\s*(.+)$/);
    if (m) turns.push({ speaker: m[1] as Turn["speaker"], text: m[2].trim() });
  }
  return turns;
}

/** 폴백용 보이스: 두 화자 모두 "가장 좋은" 한국어 보이스 하나만 쓴다.
 *  (두 번째 보이스는 대개 품질이 나빠 전문가 목소리가 이상해지는 원인이었음.
 *  화자 구분은 피치·속도의 미세한 차이로만.) */
function pickBestVoice(): SpeechSynthesisVoice | null {
  const all = window.speechSynthesis.getVoices();
  const ko = all.filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  return (
    ko.find((v) => /natural|premium|neural/i.test(v.name)) ||
    ko.find((v) => /google/i.test(v.name)) ||
    ko[0] ||
    null
  );
}

export default function AudioLecture({
  topic,
  topicId,
}: {
  topic: string;
  topicId?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [scriptText, setScriptText] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(-1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showScript, setShowScript] = useState(false);
  const stopRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      stopRef.current = true;
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 토픽이 바뀌면 대본·오디오를 비운다.
  useEffect(() => {
    stop();
    setTurns([]);
    setScriptText("");
    setError("");
    setNotice("");
    setShowScript(false);
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  function stop() {
    stopRef.current = true;
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
    setCurrent(-1);
  }

  /** 폴백: 브라우저 TTS로 턴별 재생(신경망 TTS 실패 시에만). */
  function playFallback(list: Turn[], i: number) {
    if (stopRef.current || i >= list.length) {
      setPlaying(false);
      setCurrent(-1);
      return;
    }
    setCurrent(i);
    const t = list[i];
    const u = new SpeechSynthesisUtterance(t.text);
    u.lang = "ko-KR";
    const best = pickBestVoice();
    if (best) u.voice = best; // 두 화자 모두 최고 보이스 사용
    if (t.speaker === "진행자") {
      u.pitch = 1.08;
      u.rate = 1.04;
    } else {
      u.pitch = 0.97; // 미세한 차이만 — 어색한 저음 금지
      u.rate = 0.99;
    }
    u.onend = () => playFallback(list, i + 1);
    u.onerror = () => playFallback(list, i + 1);
    window.speechSynthesis.speak(u);
  }

  async function start() {
    if (playing) {
      stop();
      return;
    }
    setError("");
    setNotice("");

    // 1) 대본 확보(없으면 생성)
    let list = turns;
    let raw = scriptText;
    if (!list.length) {
      setLoadingMsg("대본 만드는 중…");
      try {
        const res = await fetch("/api/audio-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, topicId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "대본 생성 실패");
        raw = data.script as string;
        list = parseScript(raw);
        if (!list.length) throw new Error("대본 형식 오류 — 다시 시도해 주세요.");
        setTurns(list);
        setScriptText(raw);
        setShowScript(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
        setLoadingMsg("");
        return;
      }
    }

    // 2) 신경망 TTS mp3 (재생 시 재사용)
    stopRef.current = false;
    if (!audioUrlRef.current) {
      setLoadingMsg("목소리 만드는 중… (첫 재생만 몇 초 걸려요)");
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script: raw }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "음성 합성 실패");
        const bin = atob(data.audio as string);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: data.mime || "audio/mpeg" });
        audioUrlRef.current = URL.createObjectURL(blob);
      } catch {
        // 서버 신경망 TTS 실패(클라우드 IP 차단 등) →
        // 브라우저에서 Edge 신경망에 "직접" 연결(일반 IP는 차단 안 됨).
        try {
          setLoadingMsg("목소리 만드는 중… (고품질 직결)");
          const blob = await edgeSynthesizeTurnsBrowser(list, (d, tot) =>
            setLoadingMsg(`목소리 만드는 중… ${d}/${tot}`),
          );
          audioUrlRef.current = URL.createObjectURL(blob);
        } catch (e2) {
          // 그래도 실패하면 마지막으로 브라우저 기본 음성.
          setLoadingMsg("");
          if (!("speechSynthesis" in window)) {
            setError(e2 instanceof Error ? e2.message : "음성 재생 불가");
            return;
          }
          setNotice(
            "고품질 음성 미설정 — 기본 음성으로 재생합니다. (설정 > 무료 TTS 키 등록 시 사람 목소리로 나와요)",
          );
          setPlaying(true);
          playFallback(list, 0);
          return;
        }
      }
      setLoadingMsg("");
    }

    // 3) mp3 재생
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.src = audioUrlRef.current;
    audio.onended = () => {
      setPlaying(false);
    };
    setPlaying(true);
    audio.play().catch(() => {
      setPlaying(false);
      setError("재생을 시작하지 못했어요. 다시 눌러주세요.");
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={start}
          disabled={!!loadingMsg}
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            playing
              ? "border-rose-300 bg-rose-500 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          } ${loadingMsg ? "opacity-60" : ""}`}
        >
          {loadingMsg || (playing ? "⏹ 정지" : "🎧 오디오 강의")}
        </button>
        {turns.length > 0 && (
          <button
            onClick={() => setShowScript((s) => !s)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
          >
            {showScript ? "대본 접기" : "대본 보기"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {notice && <p className="mt-2 text-xs text-amber-600">{notice}</p>}
      {showScript && turns.length > 0 && (
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {turns.map((t, i) => (
            <p
              key={i}
              className={`rounded-lg px-3 py-1.5 text-sm leading-relaxed ${
                i === current
                  ? "bg-amber-100 text-slate-900"
                  : t.speaker === "진행자"
                    ? "bg-white text-slate-600"
                    : "bg-emerald-50 text-slate-800"
              }`}
            >
              <span
                className={`mr-1.5 text-[11px] font-bold ${
                  t.speaker === "진행자" ? "text-sky-600" : "text-emerald-700"
                }`}
              >
                {t.speaker}
              </span>
              {t.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
