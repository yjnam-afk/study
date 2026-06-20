/**
 * 오답노트와 퀴즈 학습 통계를 브라우저 localStorage 에 저장/관리합니다.
 * 서버 DB 없이 가볍게 동작하도록 클라이언트 측에서만 사용합니다.
 */

export type WrongNote = {
  /** 문제 텍스트 기반 고유 키 (중복 저장 방지) */
  id: string;
  topic: string;
  question: string;
  options: string[];
  /** 정답 인덱스(0~3) */
  answer: number;
  /** 사용자가 고른 오답 인덱스 */
  picked: number;
  explanation: string;
  createdAt: string;
};

export type QuizStats = {
  /** 푼 문제 수 */
  total: number;
  /** 맞힌 문제 수 */
  correct: number;
  lastAt: string | null;
};

const NOTES_KEY = "info-pe-wrong-notes-v1";
const STATS_KEY = "info-pe-quiz-stats-v1";

function isBrowser() {
  return typeof window !== "undefined";
}

/** 문제 텍스트로 안정적인 ID 생성(같은 문제는 같은 ID). */
function makeId(question: string): string {
  let hash = 0;
  for (let i = 0; i < question.length; i++) {
    hash = (hash * 31 + question.charCodeAt(i)) | 0;
  }
  return `n${Math.abs(hash)}`;
}

// ── 오답노트 ─────────────────────────────────────────────

export function loadNotes(): WrongNote[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as WrongNote[]) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: WrongNote[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/** 오답을 노트에 추가(이미 있으면 최신 정보로 갱신). 갱신된 목록을 반환. */
export function addNote(note: Omit<WrongNote, "id" | "createdAt">): WrongNote[] {
  const notes = loadNotes();
  const id = makeId(note.question);
  const existingIdx = notes.findIndex((n) => n.id === id);
  const entry: WrongNote = { ...note, id, createdAt: new Date().toISOString() };
  if (existingIdx >= 0) {
    notes[existingIdx] = entry;
  } else {
    notes.unshift(entry);
  }
  saveNotes(notes);
  return notes;
}

export function removeNote(id: string): WrongNote[] {
  const notes = loadNotes().filter((n) => n.id !== id);
  saveNotes(notes);
  return notes;
}

export function clearNotes(): WrongNote[] {
  saveNotes([]);
  return [];
}

// ── 퀴즈 통계 ─────────────────────────────────────────────

export function loadStats(): QuizStats {
  if (!isBrowser()) return { total: 0, correct: 0, lastAt: null };
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    return raw
      ? (JSON.parse(raw) as QuizStats)
      : { total: 0, correct: 0, lastAt: null };
  } catch {
    return { total: 0, correct: 0, lastAt: null };
  }
}

/** 퀴즈 한 문제 채점 결과를 누적 기록. */
export function recordQuiz(correct: boolean): QuizStats {
  const stats = loadStats();
  const next: QuizStats = {
    total: stats.total + 1,
    correct: stats.correct + (correct ? 1 : 0),
    lastAt: new Date().toISOString(),
  };
  if (isBrowser()) {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(next));
  }
  return next;
}
