"use client";

import { useState, useSyncExternalStore } from "react";
import {
  subscribe,
  getState,
  getServerState,
  play,
} from "@/lib/audioPlayer";

/**
 * 🎧 오디오 강의 버튼(페이지용 리모컨).
 * 실제 재생은 전역 플레이어(audioPlayer)가 담당 → 페이지를 이동해도
 * 하단 미니 플레이어에서 계속 재생된다. 여기선 시작/일시정지와
 * (이 토픽 재생 중일 때) 대본 표시만 한다.
 */
export default function AudioLecture({
  topic,
  topicId,
}: {
  topic: string;
  topicId?: string;
}) {
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  const [showScript, setShowScript] = useState(false);
  const mine = s.topic === topic && s.active;

  const label = mine
    ? s.loadingMsg ||
      (s.playing ? "⏸ 일시정지" : s.mode ? "▶ 이어듣기" : "🎧 오디오 강의")
    : "🎧 오디오 강의";

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => play(topic, topicId)}
          disabled={mine && !!s.loadingMsg}
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            mine && s.playing
              ? "border-brand-300 bg-brand-500 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          } ${mine && s.loadingMsg ? "opacity-60" : ""}`}
        >
          {label}
        </button>
        {mine && s.turns.length > 0 && (
          <button
            onClick={() => setShowScript((v) => !v)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
          >
            {showScript ? "대본 접기" : "대본 보기"}
          </button>
        )}
      </div>
      {mine && s.error && (
        <p className="mt-2 text-xs text-brand-600">{s.error}</p>
      )}
      {mine && showScript && s.turns.length > 0 && (
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {s.turns.map((t, i) => (
            <p
              key={i}
              className={`rounded-lg px-3 py-1.5 text-sm leading-relaxed ${
                i === s.currentTurn
                  ? "bg-amber-100 text-slate-900"
                  : t.speaker === "진행자"
                    ? "bg-white text-slate-600"
                    : "bg-amber-50 text-slate-800"
              }`}
            >
              <span
                className={`mr-1.5 text-[11px] font-bold ${
                  t.speaker === "진행자" ? "text-sky-600" : "text-amber-700"
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
