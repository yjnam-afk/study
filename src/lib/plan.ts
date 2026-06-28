/**
 * 데일리 학습 계획 — 내일(2026-06-29)부터 8월 말까지 매일 토픽을 배정한다.
 * 홈(오늘의 토픽)과 달력(/plan)이 같은 로직을 공유한다.
 */
import topics from "@/data/topics.json";

export type PlanTopic = {
  id: string;
  title: string;
  category: string;
  importance: string;
};

export const PLAN_START = new Date(2026, 5, 29); // 6/29
export const PLAN_END = new Date(2026, 7, 31); // 8/31
const DAY = 86400000;
export const PLAN_TOTAL_DAYS =
  Math.round((PLAN_END.getTime() - PLAN_START.getTime()) / DAY) + 1;

const PERDAY_KEY = "info-pe-plan-perday-v1";
const DONE_KEY = "info-pe-plan-done-v1";
const OVERRIDE_KEY = "info-pe-plan-overrides-v1";

const BY_ID: Record<string, PlanTopic> = {};
for (const t of topics as PlanTopic[]) BY_ID[t.id] = t;

export function topicById(id: string): PlanTopic | undefined {
  return BY_ID[id];
}

/** 날짜별 직접 편집(검수) 내용. { "YYYY-MM-DD": [topicId, ...] } — 있으면 그 날은 이 목록을 사용. */
export type Overrides = Record<string, string[]>;

export function loadOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}
export function saveOverrides(o: Overrides) {
  if (typeof window !== "undefined")
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o));
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function getPerDay(): number {
  if (typeof window === "undefined") return 10;
  const v = Number(localStorage.getItem(PERDAY_KEY));
  return v >= 3 && v <= 50 ? v : 10;
}
export function setPerDay(n: number) {
  if (typeof window !== "undefined")
    localStorage.setItem(PERDAY_KEY, String(n));
}

export function loadDone(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DONE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}
export function saveDone(s: Set<string>) {
  if (typeof window !== "undefined")
    localStorage.setItem(DONE_KEY, JSON.stringify([...s]));
}

/** 중요도 우선 + 도메인 라운드로빈(매일 다양한 분야).
 * 시험 적중 우선: 상 → 출제예상 → 중 → 하 순으로 앞에 배치한다. */
export function orderedTopics(): PlanTopic[] {
  const all = topics as PlanTopic[];
  const tiers = ["상", "출제예상", "중", "하"];
  const out: PlanTopic[] = [];
  for (const tier of tiers) {
    const inTier = all.filter((t) => t.importance === tier);
    const byCat: Record<string, PlanTopic[]> = {};
    for (const t of inTier) (byCat[t.category] ||= []).push(t);
    const cats = Object.keys(byCat).sort();
    let added = true;
    while (added) {
      added = false;
      for (const c of cats) {
        const arr = byCat[c];
        if (arr.length) {
          out.push(arr.shift()!);
          added = true;
        }
      }
    }
  }
  return out;
}

export function dateOfDay(idx: number): Date {
  return new Date(PLAN_START.getTime() + idx * DAY);
}

/** 오늘의 day 인덱스(기간 밖이면 음수 또는 범위초과). */
export function todayIndex(now: number = Date.now()): number {
  const t = new Date(now);
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((today.getTime() - PLAN_START.getTime()) / DAY);
}

export function topicsForDay(
  ordered: PlanTopic[],
  idx: number,
  perDay: number,
): PlanTopic[] {
  if (idx < 0) return [];
  return ordered.slice(idx * perDay, idx * perDay + perDay);
}

/** 편집(오버라이드) 반영된 그 날의 토픽. 오버라이드 있으면 그것을, 없으면 자동 배정. */
export function effectiveTopicsForDay(
  ordered: PlanTopic[],
  idx: number,
  perDay: number,
  overrides: Overrides,
): PlanTopic[] {
  if (idx < 0) return [];
  const key = ymd(dateOfDay(idx));
  const ov = overrides[key];
  if (ov) return ov.map((id) => BY_ID[id]).filter(Boolean);
  return topicsForDay(ordered, idx, perDay);
}

/** 계획이 토픽을 모두 소진하는 마지막 날 수. */
export function coveredDays(ordered: PlanTopic[], perDay: number): number {
  return Math.min(PLAN_TOTAL_DAYS, Math.ceil(ordered.length / perDay));
}

/** 전체 토픽 수. */
export function totalTopicCount(): number {
  return (topics as PlanTopic[]).length;
}

/**
 * 완주 예측. perDay 속도로 전체 토픽을 끝내는 데 며칠/언제까지 걸리는지,
 * 8/31(기간 내)에 끝나는지 + 기간 내 완주에 필요한 하루 토픽 수를 계산한다.
 */
export function finishForecast(perDay: number): {
  total: number;
  needDays: number;
  finishDate: Date;
  withinPlan: boolean;
  requiredPerDay: number;
  /** 시험 적중 핵심(상+출제예상) 토픽 수 */
  coreCount: number;
  /** 핵심만 8/31까지 끝내는 데 필요한 하루 토픽 수 */
  coreRequiredPerDay: number;
  /** 현재 속도로 핵심을 끝내는 날짜 */
  coreFinishDate: Date;
} {
  const all = topics as PlanTopic[];
  const total = all.length;
  const coreCount = all.filter(
    (t) => t.importance === "상" || t.importance === "출제예상",
  ).length;
  const needDays = Math.ceil(total / Math.max(1, perDay));
  const finishDate = dateOfDay(needDays - 1);
  const withinPlan = needDays <= PLAN_TOTAL_DAYS;
  const requiredPerDay = Math.ceil(total / PLAN_TOTAL_DAYS);
  const coreRequiredPerDay = Math.ceil(coreCount / PLAN_TOTAL_DAYS);
  const coreFinishDate = dateOfDay(
    Math.ceil(coreCount / Math.max(1, perDay)) - 1,
  );
  return {
    total,
    needDays,
    finishDate,
    withinPlan,
    requiredPerDay,
    coreCount,
    coreRequiredPerDay,
    coreFinishDate,
  };
}
