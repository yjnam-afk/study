/**
 * 회독(반복 학습) 진도를 브라우저 localStorage 에 저장/관리합니다.
 * 서버 DB 없이 가볍게 동작하도록 클라이언트 측에서만 사용합니다.
 */

export type ReviewStatus = "todo" | "learning" | "done";

export type ReviewItem = {
  topicId: string;
  /** 회독 횟수 */
  rounds: number;
  status: ReviewStatus;
  /** 마지막 학습 시각(ISO) */
  lastReviewedAt: string | null;
  /** 다음 복습 예정일(ISO) — 망각곡선 간격 반복 */
  nextDueAt?: string | null;
};

/** 회독 횟수에 따른 다음 복습까지의 간격(일). 망각곡선 기반(1·3·7·14·30일). */
const INTERVAL_DAYS = [1, 3, 7, 14, 30];

export function intervalDays(rounds: number): number {
  return INTERVAL_DAYS[Math.min(rounds, INTERVAL_DAYS.length) - 1] || 30;
}

const KEY = "info-pe-review-v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadReview(): Record<string, ReviewItem> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReviewItem>) : {};
  } catch {
    return {};
  }
}

export function saveReview(state: Record<string, ReviewItem>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("progress-change"));
}

export function getItem(
  state: Record<string, ReviewItem>,
  topicId: string,
): ReviewItem {
  return (
    state[topicId] || {
      topicId,
      rounds: 0,
      status: "todo",
      lastReviewedAt: null,
    }
  );
}

/** 한 회독 완료: 회독수 +1, 상태/시각/다음 복습일 갱신 */
export function markReviewed(
  state: Record<string, ReviewItem>,
  topicId: string,
): Record<string, ReviewItem> {
  const item = getItem(state, topicId);
  const rounds = item.rounds + 1;
  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + intervalDays(rounds));
  const next: ReviewItem = {
    ...item,
    rounds,
    status: rounds >= 3 ? "done" : "learning",
    lastReviewedAt: now.toISOString(),
    nextDueAt: due.toISOString(),
  };
  return { ...state, [topicId]: next };
}

/** 오늘 복습해야 하는 항목인지(복습일 지남). 시작 전(rounds 0)은 제외. */
export function isDue(item: ReviewItem, now: number = Date.now()): boolean {
  if (item.rounds === 0) return false;
  if (!item.nextDueAt) return true; // 예전 데이터(주기 없음)는 복습 대상으로 간주
  return new Date(item.nextDueAt).getTime() <= now;
}

/** 복습일까지 남은 일수(음수면 지남). nextDueAt 없으면 0. */
export function daysUntilDue(item: ReviewItem, now: number = Date.now()): number {
  if (!item.nextDueAt) return 0;
  const ms = new Date(item.nextDueAt).getTime() - now;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** 진도 초기화 */
export function resetItem(
  state: Record<string, ReviewItem>,
  topicId: string,
): Record<string, ReviewItem> {
  const next = { ...state };
  delete next[topicId];
  return next;
}
