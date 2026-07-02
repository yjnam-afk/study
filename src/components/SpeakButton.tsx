"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 브라우저 내장 음성합성(Web Speech API)으로 텍스트를 한국어로 읽어준다.
 * 무료·오프라인·API 토큰 0. 지하철/이동 중 귀로 학습용.
 *
 * getText는 클릭 시점에 읽을 문자열을 만든다(마크다운/기호는 호출부에서 정리).
 */
export default function SpeakButton({
  getText,
  label = "듣기",
  className = "",
  rate = 1,
}: {
  getText: () => string;
  label?: string;
  className?: string;
  rate?: number;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "speechSynthesis" in window,
    );
    // 페이지 이탈/언마운트 시 읽기 중단
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function toggle() {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const text = (getText() || "").trim();
    if (!text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = rate;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    setSpeaking(true);
    synth.speak(u);
  }

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      aria-label={speaking ? "읽기 중지" : "소리내어 읽기"}
      className={
        className ||
        `inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
          speaking
            ? "border-brand-400 bg-brand-500 text-white"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
        }`
      }
    >
      {speaking ? "⏹ 정지" : `🔊 ${label}`}
    </button>
  );
}

/** 마크다운/기호를 제거해 음성 낭독에 적합한 평문으로 정리한다. */
export function toSpeech(md: string): string {
  if (!md) return "";
  return md
    .replace(/```[\s\S]*?```/g, " ") // 코드/머메이드 블록 제거
    .replace(/\|[^\n]*\|/g, " ") // 표 행 제거
    .replace(/[#>*_`~]/g, " ") // 마크다운 기호
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 링크는 텍스트만
    .replace(/-->/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ". ")
    .trim();
}
