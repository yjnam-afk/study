"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 🎧 오디오 강의 — NotebookLM 오디오 오버뷰 스타일.
 * AI가 쓴 "진행자/전문가 팟캐스트 대본"을 받아, 두 화자를 서로 다른
 * 목소리(보이스/피치)로 번갈아 낭독한다. 대본은 화면에도 표시.
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

/** 한국어 보이스 두 개 고르기(없으면 하나를 피치로 구분). */
function pickVoices(): {
  host: SpeechSynthesisVoice | null;
  expert: SpeechSynthesisVoice | null;
} {
  const all = window.speechSynthesis.getVoices();
  const ko = all.filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  const ranked = [
    ...ko.filter((v) => /natural|premium|neural/i.test(v.name)),
    ...ko.filter((v) => /google/i.test(v.name)),
    ...ko,
  ];
  const uniq = Array.from(new Set(ranked));
  return { host: uniq[0] || null, expert: uniq[1] || uniq[0] || null };
}

export default function AudioLecture({
  topic,
  topicId,
}: {
  topic: string;
  topicId?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(-1);
  const [error, setError] = useState("");
  const [showScript, setShowScript] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices(); // 보이스 미리 로드
    }
    return () => {
      stopRef.current = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 토픽이 바뀌면 이전 대본·재생 상태를 비운다.
  useEffect(() => {
    stop();
    setTurns([]);
    setError("");
    setShowScript(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  function stop() {
    stopRef.current = true;
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setCurrent(-1);
  }

  function playFrom(list: Turn[], i: number) {
    if (stopRef.current || i >= list.length) {
      setPlaying(false);
      setCurrent(-1);
      return;
    }
    const t = list[i];
    setCurrent(i);
    const u = new SpeechSynthesisUtterance(t.text);
    u.lang = "ko-KR";
    const { host, expert } = pickVoices();
    const sameVoice = !host || !expert || host === expert;
    if (t.speaker === "진행자") {
      if (host) u.voice = host;
      u.pitch = sameVoice ? 1.15 : 1.05;
      u.rate = 1.02;
    } else {
      if (expert) u.voice = expert;
      u.pitch = sameVoice ? 0.9 : 1.0;
      u.rate = 0.98;
    }
    u.onend = () => playFrom(list, i + 1);
    u.onerror = () => playFrom(list, i + 1);
    window.speechSynthesis.speak(u);
  }

  async function start() {
    if (playing) {
      stop();
      return;
    }
    if (!("speechSynthesis" in window)) {
      setError("이 브라우저는 음성 재생을 지원하지 않아요.");
      return;
    }
    setError("");
    let list = turns;
    if (!list.length) {
      setLoading(true);
      try {
        const res = await fetch("/api/audio-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, topicId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "대본 생성 실패");
        list = parseScript(data.script);
        if (!list.length) throw new Error("대본 형식 오류 — 다시 시도해 주세요.");
        setTurns(list);
        setShowScript(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    stopRef.current = false;
    setPlaying(true);
    window.speechSynthesis.cancel();
    playFrom(list, 0);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={start}
          disabled={loading}
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            playing
              ? "border-rose-300 bg-rose-500 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          } ${loading ? "opacity-60" : ""}`}
        >
          {loading ? "대본 만드는 중…" : playing ? "⏹ 정지" : "🎧 오디오 강의"}
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
