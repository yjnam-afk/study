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
const TOPICDONE_KEY = "info-pe-plan-topicdone-v1";

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

/** 하루 분량 변경 이력(세그먼트). fromDay(포함)부터 그 perDay가 적용된다.
 *  예: [{fromDay:0,perDay:10},{fromDay:7,perDay:20}] = 0~6일 10개, 7일부터 20개.
 *  → 속도를 바꿔도 "과거 날짜"는 그때 속도로 고정되어 이미 한 진도가 밀리지 않는다. */
export type PerDaySegment = { fromDay: number; perDay: number };
const SCHEDULE_KEY = "info-pe-plan-perday-sched-v1";

export function getSchedule(): PerDaySegment[] {
  if (typeof window === "undefined") return [{ fromDay: 0, perDay: 10 }];
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as PerDaySegment[];
      if (Array.isArray(s) && s.length)
        return s
          .filter((x) => x && x.perDay >= 3 && x.perDay <= 50)
          .sort((a, b) => a.fromDay - b.fromDay);
    }
  } catch {
    /* noop */
  }
  // 레거시 단일 perDay → 세그먼트 1개로 이관(기존 사용자 진도 보존).
  const legacy = Number(localStorage.getItem(PERDAY_KEY));
  const pd = legacy >= 3 && legacy <= 50 ? legacy : 10;
  return [{ fromDay: 0, perDay: pd }];
}
export function saveSchedule(s: PerDaySegment[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s));
}
/** idx일에 적용되는 하루 분량. */
export function perDayOn(idx: number, sched: PerDaySegment[] = getSchedule()): number {
  let pd = sched[0]?.perDay ?? 10;
  for (const seg of sched) {
    if (seg.fromDay <= idx) pd = seg.perDay;
    else break;
  }
  return pd;
}

/** 이 날(포함)부터 일요일은 쉬는 날 — 토픽 미배정. 그 이전 일요일은 이미 한 진도 보존을 위해 그대로 둔다.
 *  2026-07-12(일, day 13)에 "앞으로 일요일 휴식" 요청 → 그날부터 고정 앵커. */
export const SUNDAY_REST_FROM = 13;
/** idx일이 쉬는 날(앵커 이후의 일요일)인가. */
export function isRestDay(idx: number): boolean {
  return idx >= SUNDAY_REST_FROM && dateOfDay(idx).getDay() === 0;
}
/** 쉬는 날이면 0, 아니면 그날 분량 — 오프셋·배정 계산의 실효 분량. */
export function effPerDay(idx: number, sched: PerDaySegment[] = getSchedule()): number {
  return isRestDay(idx) ? 0 : perDayOn(idx, sched);
}
/** idx일 이전(0..idx-1)까지 소진되는 토픽 수 = idx일의 시작 오프셋. */
export function topicOffset(idx: number, sched: PerDaySegment[] = getSchedule()): number {
  let off = 0;
  for (let d = 0; d < idx; d++) off += effPerDay(d, sched);
  return off;
}
/** fromDay(그날 포함)부터 새 분량 적용. 그 이전 날짜는 기존 속도로 그대로 유지. */
export function setPerDayFrom(fromDay: number, perDay: number) {
  if (typeof window === "undefined") return;
  const f = Math.max(0, fromDay);
  const kept = getSchedule().filter((seg) => seg.fromDay < f);
  const sched = [...kept, { fromDay: f, perDay }].sort(
    (a, b) => a.fromDay - b.fromDay,
  );
  saveSchedule(sched);
  localStorage.setItem(PERDAY_KEY, String(perDay)); // 오늘 속도(레거시 호환)
  localStorage.removeItem("info-pe-plan-anchor-v1");
}

/** 오늘 적용 중인 하루 분량(표시·예측용). */
export function getPerDay(): number {
  if (typeof window === "undefined") return 10;
  const ti = todayIndex();
  return perDayOn(ti < 0 ? 0 : ti);
}
/** 하루 분량 변경 — "오늘부터" 적용(어제까지 진도는 보존). */
export function setPerDay(n: number) {
  if (typeof window === "undefined") return;
  const ti = todayIndex();
  setPerDayFrom(ti < 0 ? 0 : ti, n);
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

/** 토픽 단위 완료 체크(실제로 학습한 토픽 id). 하루의 토픽을 모두 체크하면 그 날이 완료된다. */
export function loadTopicDone(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(TOPICDONE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}
export function saveTopicDone(s: Set<string>) {
  if (typeof window !== "undefined")
    localStorage.setItem(TOPICDONE_KEY, JSON.stringify([...s]));
}
/** 그 날의 토픽이 모두 완료됐는지(= 달력 '참 잘했어요' 도장 조건). */
export function isDayComplete(
  list: { id: string }[],
  topicDone: Set<string>,
): boolean {
  return list.length > 0 && list.every((t) => topicDone.has(t.id));
}
/** 그 날의 완료 토픽 수. */
export function dayDoneCount(
  list: { id: string }[],
  topicDone: Set<string>,
): number {
  return list.filter((t) => topicDone.has(t.id)).length;
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
  sched: PerDaySegment[] = getSchedule(),
): PlanTopic[] {
  if (idx < 0) return [];
  // 쉬는 날(앵커 이후 일요일)은 배정 없음 → 그날 토픽은 다음 날로 자연히 밀린다.
  if (isRestDay(idx)) return [];
  // day N = 그날까지 누적 오프셋부터 그날 분량만큼. 과거 분량은 세그먼트로 고정.
  const off = topicOffset(idx, sched);
  return ordered.slice(off, off + perDayOn(idx, sched));
}

/** 편집(오버라이드) 반영된 그 날의 토픽. 오버라이드 있으면 그것을, 없으면 자동 배정. */
export function effectiveTopicsForDay(
  ordered: PlanTopic[],
  idx: number,
  sched: PerDaySegment[],
  overrides: Overrides,
): PlanTopic[] {
  if (idx < 0) return [];
  const key = ymd(dateOfDay(idx));
  const ov = overrides[key];
  if (ov) return ov.map((id) => BY_ID[id]).filter(Boolean);
  return topicsForDay(ordered, idx, sched);
}

/** 계획이 토픽을 모두 소진하는 마지막 날 수. */
export function coveredDays(ordered: PlanTopic[], perDay: number): number {
  return Math.min(PLAN_TOTAL_DAYS, Math.ceil(ordered.length / perDay));
}

/** 쉬는 날(일요일 휴식)을 반영해 실제로 토픽을 모두 소진하는 마지막 날 수.
 *  일요일이 빠지므로 단순 나눗셈보다 며칠 더 밀린다 — 달력에 마지막 토픽까지 보이게. */
export function coveredDaysSched(
  total: number,
  sched: PerDaySegment[] = getSchedule(),
): number {
  let off = 0;
  for (let d = 0; d < PLAN_TOTAL_DAYS; d++) {
    off += effPerDay(d, sched);
    if (off >= total) return d + 1;
  }
  return PLAN_TOTAL_DAYS;
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
