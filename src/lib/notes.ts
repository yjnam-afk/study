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
  /** 누적 틀린 횟수 (자주 틀릴수록 자주 다시 출제) */
  wrongCount: number;
  /** 복습에서 맞힌 횟수 */
  correctCount: number;
  /** 라이트너 박스 단계(1~5). 맞히면 ↑, 틀리면 1로 초기화 */
  box: number;
  /** 다음 복습 예정일(ISO) */
  nextDueAt: string | null;
  /** 박스 5단계 도달 = 암기 완료 */
  mastered: boolean;
};

/** 라이트너 박스 단계별 다음 복습까지 간격(일). box1=오늘 다시. */
const NOTE_INTERVALS = [0, 1, 3, 7, 14];
const MAX_BOX = 5;

function noteIntervalDays(box: number): number {
  return NOTE_INTERVALS[Math.min(Math.max(box, 1), MAX_BOX) - 1] ?? 14;
}

function dueAtFromBox(box: number): string {
  const d = new Date();
  d.setDate(d.getDate() + noteIntervalDays(box));
  return d.toISOString();
}

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

/** 예전 데이터 호환: 누락된 반복 학습 필드를 채워준다. */
function normalize(n: Partial<WrongNote>): WrongNote {
  return {
    id: n.id || makeId(n.question || ""),
    topic: n.topic || "기타",
    question: n.question || "",
    options: n.options || [],
    answer: n.answer ?? 0,
    picked: n.picked ?? 0,
    explanation: n.explanation || "",
    createdAt: n.createdAt || new Date().toISOString(),
    wrongCount: n.wrongCount ?? 1,
    correctCount: n.correctCount ?? 0,
    box: n.box ?? 1,
    nextDueAt: n.nextDueAt ?? null,
    mastered: n.mastered ?? false,
  };
}

export function loadNotes(): WrongNote[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    const arr = raw ? (JSON.parse(raw) as Partial<WrongNote>[]) : [];
    return arr.map(normalize);
  } catch {
    return [];
  }
}

function emitChange() {
  if (isBrowser()) window.dispatchEvent(new Event("progress-change"));
}

function saveNotes(notes: WrongNote[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  emitChange();
}

/** 동기화용: 오답노트 전체를 교체 저장한다. */
export function replaceNotes(notes: WrongNote[]) {
  saveNotes(notes.map(normalize));
}

/** 동기화용: 퀴즈 통계를 통째로 저장한다. */
export function setStats(stats: QuizStats) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

/**
 * 오답 발생 시 노트에 추가. 이미 있으면 틀린 횟수 +1, 박스를 1로 초기화하여
 * 곧바로 다시 복습 대상이 되게 한다(자주 틀리는 문제 = 자주 반복).
 */
export function addNote(
  note: Pick<
    WrongNote,
    "topic" | "question" | "options" | "answer" | "picked" | "explanation"
  >,
): WrongNote[] {
  const notes = loadNotes();
  const id = makeId(note.question);
  const existingIdx = notes.findIndex((n) => n.id === id);
  if (existingIdx >= 0) {
    const prev = notes[existingIdx];
    notes[existingIdx] = {
      ...prev,
      ...note,
      wrongCount: prev.wrongCount + 1,
      box: 1,
      nextDueAt: dueAtFromBox(1),
      mastered: false,
    };
  } else {
    notes.unshift({
      ...note,
      id,
      createdAt: new Date().toISOString(),
      wrongCount: 1,
      correctCount: 0,
      box: 1,
      nextDueAt: dueAtFromBox(1),
      mastered: false,
    });
  }
  saveNotes(notes);
  return notes;
}

/**
 * 오답 복습 채점 결과 반영.
 *  - 맞히면 박스 단계 ↑(간격 증가), 5단계 도달 시 암기 완료.
 *  - 틀리면 박스 1로 초기화 + 틀린 횟수 ↑ → 곧 다시 출제.
 */
export function reviewNote(id: string, correct: boolean): WrongNote[] {
  const notes = loadNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return notes;
  const n = notes[idx];
  if (correct) {
    const box = Math.min(n.box + 1, MAX_BOX);
    notes[idx] = {
      ...n,
      box,
      correctCount: n.correctCount + 1,
      nextDueAt: dueAtFromBox(box),
      mastered: box >= MAX_BOX,
    };
  } else {
    notes[idx] = {
      ...n,
      box: 1,
      wrongCount: n.wrongCount + 1,
      nextDueAt: dueAtFromBox(1),
      mastered: false,
    };
  }
  saveNotes(notes);
  return notes;
}

/** 오늘 복습할 오답인지(암기 완료 제외, 복습일 지남). */
export function isNoteDue(n: WrongNote, now: number = Date.now()): boolean {
  if (n.mastered) return false;
  if (!n.nextDueAt) return true;
  return new Date(n.nextDueAt).getTime() <= now;
}

/** 복습할 오답 목록(자주 틀린 순 → 오래된 순). */
export function dueNotes(notes: WrongNote[]): WrongNote[] {
  return notes
    .filter((n) => isNoteDue(n))
    .sort(
      (a, b) =>
        b.wrongCount - a.wrongCount ||
        new Date(a.nextDueAt || a.createdAt).getTime() -
          new Date(b.nextDueAt || b.createdAt).getTime(),
    );
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
    emitChange();
  }
  return next;
}
