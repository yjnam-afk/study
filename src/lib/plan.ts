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

/** 중요도 우선 + 도메인 라운드로빈(매일 다양한 분야). */
export function orderedTopics(): PlanTopic[] {
  const all = topics as PlanTopic[];
  const tiers = ["상", "중", "출제예상", "하"];
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

/** 계획이 토픽을 모두 소진하는 마지막 날 수. */
export function coveredDays(ordered: PlanTopic[], perDay: number): number {
  return Math.min(PLAN_TOTAL_DAYS, Math.ceil(ordered.length / perDay));
}
