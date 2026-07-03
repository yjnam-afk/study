/**
 * 🎧 전역 오디오 강의 플레이어(싱글톤).
 *
 * 재생 상태를 페이지 컴포넌트가 아니라 앱 전역 모듈이 들고 있어,
 * 두음신공 ↔ 설명 등 페이지를 오가도 재생이 끊기지 않는다.
 * 하단 미니 플레이어(GlobalAudioPlayer)와 페이지 버튼(AudioLecture)이
 * 이 스토어를 함께 구독한다.
 */
import { edgeSynthesizeTurnsBrowser } from "@/lib/edgeTtsClient";

export type Turn = { speaker: "진행자" | "전문가"; text: string };

export type PlayerState = {
  /** 미니 플레이어 표시 여부(✕로 닫기 전까지 유지). */
  active: boolean;
  topic: string;
  topicId?: string;
  turns: Turn[];
  loadingMsg: string;
  playing: boolean;
  /** 기본음성(폴백) 재생 중 현재 턴(대본 하이라이트용). mp3 모드는 -1. */
  currentTurn: number;
  mode: "mp3" | "fallback" | null;
  error: string;
};

const INITIAL: PlayerState = {
  active: false,
  topic: "",
  turns: [],
  loadingMsg: "",
  playing: false,
  currentTurn: -1,
  mode: null,
  error: "",
};

let state: PlayerState = INITIAL;
const listeners = new Set<() => void>();
function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function getState(): PlayerState {
  return state;
}
/** SSR 스냅샷(useSyncExternalStore용) — 항상 동일 참조. */
export function getServerState(): PlayerState {
  return INITIAL;
}

// ── 내부 리소스 ────────────────────────────────────────────
let audioEl: HTMLAudioElement | null = null;
let serverTtsDead = false;
let browserEdgeDead = false;
let fallbackStop = false;
const scriptCache = new Map<string, { raw: string; turns: Turn[] }>();
const urlCache = new Map<string, string>();

function ensureAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.onended = () => set({ playing: false });
  }
  return audioEl;
}

function bestKoVoice(): SpeechSynthesisVoice | null {
  const ko = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  return (
    ko.find((v) => /natural|premium|neural/i.test(v.name)) ||
    ko.find((v) => /google/i.test(v.name)) ||
    ko[0] ||
    null
  );
}

function playFallback(list: Turn[], i: number) {
  if (fallbackStop || i >= list.length) {
    set({ playing: false, currentTurn: -1 });
    return;
  }
  set({ currentTurn: i, playing: true });
  const t = list[i];
  const u = new SpeechSynthesisUtterance(t.text);
  u.lang = "ko-KR";
  const v = bestKoVoice();
  if (v) u.voice = v;
  if (t.speaker === "진행자") {
    u.pitch = 1.08;
    u.rate = 1.04;
  } else {
    u.pitch = 0.97;
    u.rate = 0.99;
  }
  u.onend = () => playFallback(list, i + 1);
  u.onerror = () => playFallback(list, i + 1);
  window.speechSynthesis.speak(u);
}

// ── 공개 API ──────────────────────────────────────────────
/** 완전 정지(처음으로 되감기). 미니 플레이어는 유지. */
export function stopPlayback() {
  fallbackStop = true;
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  set({ playing: false, currentTurn: -1, loadingMsg: "" });
}

/** 일시정지 ↔ 이어듣기. */
export function pauseResume() {
  if (state.playing) {
    if (state.mode === "mp3") audioEl?.pause();
    else if ("speechSynthesis" in window) window.speechSynthesis.pause();
    set({ playing: false });
  } else {
    if (state.mode === "mp3" && audioEl?.src) {
      audioEl.play();
      set({ playing: true });
    } else if (state.mode === "fallback" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
      set({ playing: true });
    }
  }
}

/** 미니 플레이어 닫기(정지 포함). */
export function close() {
  stopPlayback();
  set({ ...INITIAL });
}

/** 강의 시작(같은 토픽이면 일시정지 토글, 다른 토픽이면 교체). */
export async function play(topic: string, topicId?: string) {
  if (state.topic === topic && state.mode) {
    pauseResume();
    return;
  }
  stopPlayback();
  fallbackStop = false;
  set({ active: true, topic, topicId, error: "", mode: null, turns: [] });

  // 1) 대본(세션 캐시 우선)
  let sc = scriptCache.get(topic);
  if (!sc) {
    set({ loadingMsg: "대본 만드는 중…" });
    try {
      const res = await fetch("/api/audio-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, topicId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "대본 생성 실패");
      const raw = data.script as string;
      const turns: Turn[] = [];
      for (const line of raw.split("\n")) {
        const m = line.trim().match(/^(진행자|전문가)\s*[:：]\s*(.+)$/);
        if (m)
          turns.push({ speaker: m[1] as Turn["speaker"], text: m[2].trim() });
      }
      if (!turns.length) throw new Error("대본 형식 오류 — 다시 시도해 주세요.");
      sc = { raw, turns };
      scriptCache.set(topic, sc);
    } catch (e) {
      set({
        loadingMsg: "",
        error: e instanceof Error ? e.message : "오류가 발생했습니다.",
      });
      return;
    }
  }
  set({ turns: sc.turns });

  // 2) 신경망 mp3(서버 → 브라우저 직결) — 실패 시 조용히 기본음성 폴백
  let url = urlCache.get(topic) || "";
  if (!url && !serverTtsDead) {
    set({ loadingMsg: "목소리 만드는 중…" });
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: sc.raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status !== 429) serverTtsDead = true;
        throw new Error(data.error || "합성 실패");
      }
      const bin = atob(data.audio as string);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      url = URL.createObjectURL(
        new Blob([bytes], { type: data.mime || "audio/mpeg" }),
      );
    } catch {
      /* 폴백 계속 */
    }
  }
  if (!url && !browserEdgeDead) {
    try {
      set({ loadingMsg: "목소리 만드는 중…" });
      const blob = await edgeSynthesizeTurnsBrowser(sc.turns, (d, tot) =>
        set({ loadingMsg: `목소리 만드는 중… ${d}/${tot}` }),
      );
      url = URL.createObjectURL(blob);
    } catch {
      browserEdgeDead = true;
    }
  }
  set({ loadingMsg: "" });

  if (url) {
    urlCache.set(topic, url);
    const a = ensureAudio();
    a.src = url;
    a.currentTime = 0;
    set({ mode: "mp3", playing: true, currentTurn: -1 });
    a.play().catch(() =>
      set({ playing: false, error: "재생을 시작하지 못했어요. 다시 눌러주세요." }),
    );
    return;
  }

  // 3) 기본 음성(조용한 폴백)
  if (!("speechSynthesis" in window)) {
    set({ error: "이 브라우저는 음성 재생을 지원하지 않아요." });
    return;
  }
  window.speechSynthesis.getVoices();
  set({ mode: "fallback" });
  playFallback(sc.turns, 0);
}
