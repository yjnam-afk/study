"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import ShareButton from "@/components/ShareButton";
import { mnemonicLink, explainLink } from "@/lib/coach";
import topics from "@/data/topics.json";
import {
  PlanTopic,
  PLAN_START,
  PLAN_TOTAL_DAYS,
  ymd,
  getPerDay,
  setPerDay as persistPerDay,
  loadTopicDone,
  saveTopicDone,
  isDayComplete,
  dayDoneCount,
  orderedTopics,
  dateOfDay,
  todayIndex,
  effectiveTopicsForDay,
  coveredDays,
  finishForecast,
  Overrides,
  loadOverrides,
  saveOverrides,
} from "@/lib/plan";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const DAY = 86400000;
const CATS = Array.from(new Set((topics as PlanTopic[]).map((t) => t.category)));
const IMP_ORDER: Record<string, number> = { 상: 0, 출제예상: 1, 중: 2, 하: 3 };

export default function PlanPage() {
  const [perDay, setPerDay] = useState(10);
  const [selected, setSelected] = useState<number>(-1);
  const [topicDone, setTopicDone] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Overrides>({});
  const [monthIdx, setMonthIdx] = useState(0);

  useEffect(() => {
    setPerDay(getPerDay());
    setTopicDone(loadTopicDone());
    setOverrides(loadOverrides());
    const ti = todayIndex();
    setSelected(ti >= 0 && ti < PLAN_TOTAL_DAYS ? ti : 0);
    // 기본으로 '오늘이 속한 달'을 펼친다.
    const now = new Date();
    const mi = months.findIndex(
      ([y, m]) => y === now.getFullYear() && m === now.getMonth(),
    );
    if (mi >= 0) setMonthIdx(mi);
  }, []);

  const ordered = useMemo(() => orderedTopics(), []);
  const covered = coveredDays(ordered, perDay);
  const forecast = finishForecast(perDay);

  // 모든 토픽을 체크한 '완료된 날' 수
  let completedDays = 0;
  for (let i = 0; i < covered; i++) {
    if (isDayComplete(effectiveTopicsForDay(ordered, i, perDay, overrides), topicDone))
      completedDays++;
  }

  function changePerDay(n: number) {
    setPerDay(n);
    persistPerDay(n);
  }
  function toggleTopic(id: string) {
    const next = new Set(topicDone);
    next.has(id) ? next.delete(id) : next.add(id);
    setTopicDone(next);
    saveTopicDone(next);
  }
  function updateDay(idx: number, ids: string[] | null) {
    const key = ymd(dateOfDay(idx));
    const next = { ...overrides };
    if (ids === null) delete next[key];
    else next[key] = ids;
    setOverrides(next);
    saveOverrides(next);
  }
  function dayList(idx: number): PlanTopic[] {
    return effectiveTopicsForDay(ordered, idx, perDay, overrides);
  }

  const months = [
    [2026, 5],
    [2026, 6],
    [2026, 7],
  ];
  const todayKey = ymd(new Date());

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="🗓️ 데일리 학습 계획"
          desc="내일(6/29)부터 8월 말까지, 매일 말랑말랑 소설클럽이 토픽을 배정합니다."
        />
        <div className="shrink-0">
          <ShareButton
            title="말랑말랑 소설클럽 — 데일리 학습 계획 같이해요!"
            text={`🗓️ 정보관리기술사 데일리 학습 계획 (6/29~8/31)\n하루 ${perDay}개씩 · 상·출제예상 위주로 ${completedDays}일 완료!\n매일 토픽 받고 같이 공부해요 ✍️`}
          />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">하루 토픽 수</span>
          <select
            value={perDay}
            onChange={(e) => changePerDay(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            {[6, 10, 15, 20, 24, 35, 40].map((n) => (
              <option key={n} value={n}>
                {n}개/일
                {n === forecast.requiredPerDay ? " · 8월말 완주 ✓" : ""}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs text-slate-400">
            전체 {forecast.total}토픽 · {PLAN_TOTAL_DAYS}일 · 완료 {completedDays}일
          </span>
        </div>

        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800">
          🎯 <b>상·출제예상 위주</b>로 배정합니다 (앞 토픽일수록 시험 적중↑).
          핵심 <b>상+출제예상 {forecast.coreCount}토픽</b>만 보면{" "}
          <b>하루 {forecast.coreRequiredPerDay}개</b>로 8/31까지 완주 →{" "}
          현재 {perDay}개/일이면{" "}
          <b>
            {forecast.coreFinishDate.getMonth() + 1}/
            {forecast.coreFinishDate.getDate()}
          </b>{" "}
          핵심 완료
        </div>

        <div
          className={`mt-2 rounded-xl border p-3 text-xs leading-relaxed ${
            forecast.withinPlan
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {forecast.withinPlan ? (
            <>
              📊 전체 {forecast.total}토픽까지 다 보려면 <b>{perDay}개/일</b>로{" "}
              <b>
                {forecast.finishDate.getMonth() + 1}/
                {forecast.finishDate.getDate()} 완주
              </b>{" "}
              (8/31 안에 ✓)
            </>
          ) : (
            <>
              📊 전체 {forecast.total}토픽까지 다 보려면 <b>{perDay}개/일</b>로는
              부족해요 ({forecast.needDays}일 필요). 8/31까지 전체 완주엔{" "}
              <b>하루 {forecast.requiredPerDay}개</b> 필요 — 무리면 핵심부터
              하세요.
            </>
          )}
        </div>
      </div>

      <div>
        {(() => {
          const [y, m] = months[monthIdx];
          const first = new Date(y, m, 1);
          const daysInMonth = new Date(y, m + 1, 0).getDate();
          const lead = first.getDay();
          const cells: (Date | null)[] = [];
          for (let i = 0; i < lead; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
          return (
            <div
              key={`${y}-${m}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {/* 월 전환: 한 번에 한 달만 — 세 달 세로 나열 방지 */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
                  disabled={monthIdx === 0}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 disabled:opacity-30 hover:bg-slate-50"
                  aria-label="이전 달"
                >
                  ‹
                </button>
                <div className="flex items-center gap-1.5">
                  {months.map(([yy, mm], i) => (
                    <button
                      key={`${yy}-${mm}`}
                      onClick={() => setMonthIdx(i)}
                      className={`rounded-lg px-3 py-1 text-sm font-bold transition ${
                        i === monthIdx
                          ? "bg-brand-600 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {mm + 1}월
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setMonthIdx((i) => Math.min(months.length - 1, i + 1))
                  }
                  disabled={monthIdx === months.length - 1}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 disabled:opacity-30 hover:bg-slate-50"
                  aria-label="다음 달"
                >
                  ›
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEK.map((w, i) => (
                  <div
                    key={w}
                    className={`pb-1 text-[11px] font-medium ${
                      i === 0
                        ? "text-rose-400"
                        : i === 6
                          ? "text-brand-400"
                          : "text-slate-400"
                    }`}
                  >
                    {w}
                  </div>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const idx = Math.round(
                    (d.getTime() - PLAN_START.getTime()) / DAY,
                  );
                  const inRange = idx >= 0 && idx < covered;
                  const key = ymd(d);
                  const isToday = key === todayKey;
                  const list = inRange ? dayList(idx) : [];
                  const doneN = inRange ? dayDoneCount(list, topicDone) : 0;
                  const isDone = inRange && isDayComplete(list, topicDone);
                  return (
                    <button
                      key={i}
                      disabled={!inRange}
                      onClick={() => setSelected(idx)}
                      className={`relative aspect-square rounded-lg border p-1 text-left transition ${
                        !inRange
                          ? "border-transparent text-slate-300"
                          : selected === idx
                            ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                            : isDone
                              ? "border-amber-300 bg-amber-50"
                              : "border-slate-200 hover:border-brand-300"
                      } ${isToday ? "font-bold" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] ${isToday ? "text-brand-700" : "text-slate-600"}`}
                        >
                          {d.getDate()}
                        </span>
                        {overrides[key] && (
                          <span className="text-[9px] text-amber-500">✎</span>
                        )}
                      </div>
                      {inRange &&
                        (isDone ? (
                          <div className="mt-0.5 flex flex-col items-center leading-none">
                            <span className="text-base">🌟</span>
                            <span className="text-[8px] font-bold text-rose-500">
                              참잘했어요
                            </span>
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[9px] leading-tight text-slate-400">
                            {doneN > 0 ? `${doneN}/${list.length}` : `${list.length}토픽`}
                          </div>
                        ))}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {selected >= 0 && selected < covered && (
        <DayDetail
          idx={selected}
          date={dateOfDay(selected)}
          list={dayList(selected)}
          topicDone={topicDone}
          onToggleTopic={toggleTopic}
          edited={Boolean(overrides[ymd(dateOfDay(selected))])}
          onRemove={(id) =>
            updateDay(
              selected,
              dayList(selected)
                .map((t) => t.id)
                .filter((x) => x !== id),
            )
          }
          onAdd={(id) => {
            const ids = dayList(selected).map((t) => t.id);
            if (!ids.includes(id)) updateDay(selected, [...ids, id]);
          }}
          onReset={() => updateDay(selected, null)}
        />
      )}
    </div>
  );
}

function DayDetail({
  idx,
  date,
  list,
  topicDone,
  edited,
  onToggleTopic,
  onRemove,
  onAdd,
  onReset,
}: {
  idx: number;
  date: Date;
  list: PlanTopic[];
  topicDone: Set<string>;
  edited: boolean;
  onToggleTopic: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (id: string) => void;
  onReset: () => void;
}) {
  const isToday = ymd(date) === ymd(new Date());
  const [editing, setEditing] = useState(false);
  const [cat, setCat] = useState(CATS[0]);

  const pickable = (topics as PlanTopic[])
    .filter((t) => t.category === cat && !list.some((x) => x.id === t.id))
    .sort((a, b) => (IMP_ORDER[a.importance] ?? 9) - (IMP_ORDER[b.importance] ?? 9));

  const doneN = dayDoneCount(list, topicDone);
  const allDone = isDayComplete(list, topicDone);

  return (
    <div className="mt-6 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">
          {isToday && <span className="text-brand-600">오늘 · </span>}
          {date.getMonth() + 1}/{date.getDate()} ({WEEK[date.getDay()]}) · Day{" "}
          {idx + 1}
          {edited && <span className="ml-1 text-amber-500">✎ 수정됨</span>}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {doneN}/{list.length} 완료
          </span>
          <button
            onClick={() => setEditing((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              editing
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {editing ? "검수 완료" : "✎ 검수·수정"}
          </button>
        </div>
      </div>

      {allDone && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <span className="text-2xl">🌟</span>
          <span className="text-sm font-bold text-rose-600">
            참 잘했어요! 오늘 토픽을 모두 끝냈어요.
          </span>
        </div>
      )}

      <ol className="space-y-2">
        {list.map((t, i) => {
          const checked = topicDone.has(t.id);
          return (
            <li
              key={t.id}
              className={`flex items-center gap-2 rounded-lg border p-2 ${
                checked
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              {!editing && (
                <button
                  onClick={() => onToggleTopic(t.id)}
                  aria-label="완료"
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs font-bold transition ${
                    checked
                      ? "border-amber-400 bg-amber-500 text-white"
                      : "border-slate-300 bg-white text-transparent hover:border-amber-400"
                  }`}
                >
                  ✓
                </button>
              )}
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-bold text-slate-500">
                {i + 1}
              </span>
              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                {t.importance}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  checked ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {t.title}
              </span>
              <span className="hidden text-[10px] text-slate-400 sm:inline">
                {t.category}
              </span>
              {editing ? (
                <button
                  onClick={() => onRemove(t.id)}
                  className="shrink-0 rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-bold text-rose-500 hover:bg-rose-50"
                  aria-label="제거"
                >
                  ✕
                </button>
              ) : (
                <>
                  <Link
                    href={mnemonicLink(t, true)}
                    className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
                  >
                    🥷 학습
                  </Link>
                  <Link
                    href={explainLink(t)}
                    className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    💡 설명
                  </Link>
                </>
              )}
            </li>
          );
        })}
      </ol>

      {editing ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 text-xs font-semibold text-amber-700">
            ＋ 이 날에 토픽 추가
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              key={cat}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) onAdd(e.target.value);
              }}
              className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
            >
              <option value="" disabled>
                토픽 선택해서 추가… ({pickable.length}개)
              </option>
              {pickable.slice(0, 300).map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.importance}] {t.title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onReset}
            className="mt-3 text-xs font-medium text-slate-500 hover:underline"
          >
            ↩ 이 날 자동 배정으로 되돌리기
          </button>
        </div>
      ) : (
        <Link
          href="/commute"
          className="mt-3 inline-block text-xs font-medium text-brand-600 hover:underline"
        >
          🚇 지하철 모드로 오늘 토픽 카드 넘기기 →
        </Link>
      )}
    </div>
  );
}
