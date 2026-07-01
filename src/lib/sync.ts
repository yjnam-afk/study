/**
 * 계정별 학습 진도 동기화(클라이언트).
 *
 * 로그인하면 이 기기의 학습 기록(회독·오답·퀴즈)을 서버(Upstash)와 동기화해,
 * 다른 기기로 로그인해도 개인화가 그대로 따라오게 한다.
 *
 * 병합 규칙은 "단조 증가"(더 많이 진행된 쪽 채택)라 어느 기기 데이터도 사라지지 않는다.
 */
import { ReviewItem, loadReview, saveReview } from "@/lib/storage";
import {
  WrongNote,
  QuizStats,
  loadNotes,
  loadStats,
  replaceNotes,
  setStats,
} from "@/lib/notes";
import type { Session } from "@/lib/auth";

type ProgressBlob = {
  review: Record<string, ReviewItem>;
  notes: WrongNote[];
  stats: QuizStats;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function gather(): ProgressBlob {
  return { review: loadReview(), notes: loadNotes(), stats: loadStats() };
}

function ms(iso?: string | null): number {
  return iso ? Date.parse(iso) || 0 : 0;
}

/** 회독: 더 많이 진행된 쪽(rounds 큰 쪽, 같으면 최근 학습) 채택. */
function mergeReview(
  local: Record<string, ReviewItem>,
  server: Record<string, ReviewItem>,
): Record<string, ReviewItem> {
  const out: Record<string, ReviewItem> = { ...local };
  for (const [id, s] of Object.entries(server || {})) {
    const l = out[id];
    if (!l) {
      out[id] = s;
      continue;
    }
    const sWins =
      s.rounds > l.rounds ||
      (s.rounds === l.rounds && ms(s.lastReviewedAt) > ms(l.lastReviewedAt));
    out[id] = sWins ? s : l;
  }
  return out;
}

/** 오답: id 기준 합집합. box 큰 쪽 기준, 틀린/맞은 횟수는 max, 암기완료는 OR. */
function mergeNotes(local: WrongNote[], server: WrongNote[]): WrongNote[] {
  const byId = new Map<string, WrongNote>();
  for (const n of local) byId.set(n.id, n);
  for (const s of server || []) {
    const l = byId.get(s.id);
    if (!l) {
      byId.set(s.id, s);
      continue;
    }
    const base = s.box >= l.box ? s : l;
    byId.set(s.id, {
      ...base,
      wrongCount: Math.max(s.wrongCount, l.wrongCount),
      correctCount: Math.max(s.correctCount, l.correctCount),
      mastered: s.mastered || l.mastered,
    });
  }
  return Array.from(byId.values());
}

/** 퀴즈 통계: 필드별 max(과대계상 방지), 최근 시각 유지. */
function mergeStats(local: QuizStats, server: QuizStats): QuizStats {
  const s = server || { total: 0, correct: 0, lastAt: null };
  const total = Math.max(local.total || 0, s.total || 0);
  const correct = Math.min(total, Math.max(local.correct || 0, s.correct || 0));
  const lastAt = ms(local.lastAt) >= ms(s.lastAt) ? local.lastAt : s.lastAt;
  return { total, correct, lastAt };
}

async function post(session: Session, data?: ProgressBlob) {
  const res = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: session.name, token: session.token, data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "동기화 실패");
  return json as { data?: ProgressBlob | null };
}

/** 서버 진도를 받아 로컬과 병합해 저장한다. */
export async function pullAndMerge(session: Session): Promise<void> {
  const { data } = await post(session);
  if (!data) return;
  const local = gather();
  saveReview(mergeReview(local.review, data.review || {}));
  replaceNotes(mergeNotes(local.notes, data.notes || []));
  setStats(
    mergeStats(local.stats, data.stats || { total: 0, correct: 0, lastAt: null }),
  );
}

/** 로컬에 실질적인 학습 기록이 없으면 true(서버를 덮어써 지우면 안 되는 상태). */
function isEmptyBlob(b: ProgressBlob): boolean {
  return (
    Object.keys(b.review || {}).length === 0 &&
    (b.notes?.length || 0) === 0 &&
    (b.stats?.total || 0) === 0
  );
}

/**
 * 현재 로컬 진도를 서버에 올린다.
 * 단, 로컬이 완전히 비어있으면 올리지 않는다(빈 기기가 서버의 기존 기록을
 * 통째로 덮어써 지우는 사고를 방지). 저장할 게 있으면 항상 서버와 병합한
 * 뒤(pull) 올려, 어떤 경우에도 서버 데이터가 줄어들지 않게 한다.
 */
export async function pushLocal(session: Session): Promise<void> {
  if (isEmptyBlob(gather())) return; // 빈 로컬로 서버를 덮어쓰지 않음
  await pullAndMerge(session); // 올리기 전에 서버 최신본과 병합(단조 증가 보장)
  await post(session, gather());
}

/** 받아서 병합 → 병합 결과를 다시 올린다(양방향 1회 동기화). */
export async function syncNow(session: Session): Promise<void> {
  await pullAndMerge(session);
  await pushLocal(session);
  if (isBrowser()) window.dispatchEvent(new Event("progress-synced"));
}

/** 학습 데이터 변경을 알리는 이벤트(저장 함수에서 발행). */
export function notifyProgressChange() {
  if (isBrowser()) window.dispatchEvent(new Event("progress-change"));
}
