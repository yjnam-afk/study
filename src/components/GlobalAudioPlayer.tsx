"use client";

import { useSyncExternalStore } from "react";
import {
  subscribe,
  getState,
  getServerState,
  pauseResume,
  stopPlayback,
  close,
} from "@/lib/audioPlayer";

/**
 * 하단 고정 미니 플레이어 — 페이지를 이동해도 오디오 강의가 계속 재생되고,
 * 어디서든 일시정지/정지/닫기를 할 수 있다(레이아웃에 상주).
 */
export default function GlobalAudioPlayer() {
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  if (!s.active) return null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <span className="text-lg">🎧</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {s.topic}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {s.loadingMsg ||
              s.error ||
              (s.playing
                ? s.mode === "fallback" && s.currentTurn >= 0
                  ? `재생 중 · ${s.currentTurn + 1}/${s.turns.length}`
                  : "재생 중"
                : "일시정지")}
          </p>
        </div>
        {!s.loadingMsg && !s.error && (
          <button
            onClick={pauseResume}
            aria-label={s.playing ? "일시정지" : "이어듣기"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
          >
            {s.playing ? "⏸" : "▶"}
          </button>
        )}
        {s.playing && (
          <button
            onClick={stopPlayback}
            aria-label="정지"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
          >
            ⏹
          </button>
        )}
        <button
          onClick={close}
          aria-label="플레이어 닫기"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
