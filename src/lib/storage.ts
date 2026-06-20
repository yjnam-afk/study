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
};

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

/** 한 회독 완료: 회독수 +1, 상태/시각 갱신 */
export function markReviewed(
  state: Record<string, ReviewItem>,
  topicId: string,
): Record<string, ReviewItem> {
  const item = getItem(state, topicId);
  const rounds = item.rounds + 1;
  const next: ReviewItem = {
    ...item,
    rounds,
    status: rounds >= 3 ? "done" : "learning",
    lastReviewedAt: new Date().toISOString(),
  };
  return { ...state, [topicId]: next };
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
