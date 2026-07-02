"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 브라우저 내장 음성합성(Web Speech API) 낭독 버튼. 무료·오프라인·토큰 0.
 *
 * 원문을 그대로 읽지 않는다 — 호출부가 "말하듯 재구성한 대본"(script)을 넘긴다.
 * 가능한 보이스 중 가장 자연스러운 한국어 보이스를 자동 선택한다.
 */

/** 한국어 보이스 중 자연스러운 것 우선(Google/Natural/Premium > 기본). */
function pickKoreanVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const ko = voices.filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  if (!ko.length) return null;
  return (
    ko.find((v) => /natural|premium|neural/i.test(v.name)) ||
    ko.find((v) => /google/i.test(v.name)) ||
    ko.find((v) => /yuna|siri/i.test(v.name)) ||
    ko[0]
  );
}

/** 낭독용 문자열 정리: 기호를 쉼(pause)으로 바꿔 덜 기계적으로 들리게. */
export function cleanForSpeech(s: string): string {
  return (s || "")
    .replace(/\([^)]*\)/g, " ") // 괄호 병기(영문 등)는 읽지 않음
    .replace(/[·ㆍ/]/g, ", ") // 나열 기호 → 쉼
    .replace(/[#>*_`~|]/g, " ")
    .replace(/-->/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 두음 학습 대본: 두음 복창 → 글자별 풀이 → 마무리 복창. */
export function mnemonicScript(opts: {
  topic: string;
  sections: { label: string; mnemonic: string; keywords: string[] }[];
}): string {
  const parts: string[] = [`${opts.topic}.`];
  for (const s of opts.sections) {
    if (!s.mnemonic && !s.keywords.length) continue;
    const m = (s.mnemonic || "").replace(/\s/g, "");
    const letters = [...m];
    const aligned = letters.length === s.keywords.length;
    parts.push(`${cleanForSpeech(s.label)}은, ${m}.`);
    if (aligned) {
      // "유는 유형, 개는 개념, 사는 사건" 식으로 글자별 풀이
      parts.push(
        s.keywords
          .map((k, i) => `${letters[i]}는 ${cleanForSpeech(k)}`)
          .join(", ") + ".",
      );
    } else if (s.keywords.length) {
      parts.push(s.keywords.map(cleanForSpeech).join(", ") + ".");
    }
    parts.push(`다시 한 번, ${m}.`);
  }
  return parts.join(" ");
}

/** 설명 낭독 대본: 전체를 읽지 않고 '한 줄 요약'과 '쉬운 비유'만 뽑아 읽는다. */
export function explainScript(md: string): string {
  const section = (name: string): string => {
    const m = md.match(
      new RegExp(`##\\s*${name}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`),
    );
    return m ? m[1].trim() : "";
  };
  const summary = section("한 줄 요약");
  const analogy = section("쉬운 비유");
  const out: string[] = [];
  if (summary) out.push(`한 줄 요약. ${cleanForSpeech(summary)}`);
  if (analogy) out.push(`쉬운 비유로 이해하면. ${cleanForSpeech(analogy)}`);
  if (!out.length) {
    // 섹션 구조가 없으면 앞부분만 짧게.
    out.push(cleanForSpeech(md).slice(0, 300));
  }
  return out.join(" ");
}

export default function SpeakButton({
  getText,
  label = "듣기",
  className = "",
  rate = 1,
}: {
  /** 클릭 시점에 "낭독 대본"을 만들어 반환(원문 그대로 금지). */
  getText: () => string;
  label?: string;
  className?: string;
  rate?: number;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (ok) window.speechSynthesis.getVoices(); // 보이스 목록 미리 로드
    return () => {
      if (ok) window.speechSynthesis.cancel();
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
    const v = pickKoreanVoice();
    if (v) u.voice = v;
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
