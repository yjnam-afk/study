"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { mnemonicLink } from "@/lib/coach";
import {
  PlanTopic,
  PLAN_START,
  PLAN_TOTAL_DAYS,
  ymd,
  getPerDay,
  setPerDay as persistPerDay,
  loadDone,
  saveDone,
  orderedTopics,
  dateOfDay,
  todayIndex,
  topicsForDay,
  coveredDays,
} from "@/lib/plan";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const DAY = 86400000;

export default function PlanPage() {
  const [perDay, setPerDay] = useState(10);
  const [selected, setSelected] = useState<number>(-1);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPerDay(getPerDay());
    setDone(loadDone());
    const ti = todayIndex();
    setSelected(ti >= 0 && ti < PLAN_TOTAL_DAYS ? ti : 0);
  }, []);

  const ordered = useMemo(() => orderedTopics(), []);
  const covered = coveredDays(ordered, perDay);

  function changePerDay(n: number) {
    setPerDay(n);
    persistPerDay(n);
  }
  function toggleDone(idx: number) {
    const key = ymd(dateOfDay(idx));
    const next = new Set(done);
    next.has(key) ? next.delete(key) : next.add(key);
    setDone(next);
    saveDone(next);
  }

  const months = [
    [2026, 5],
    [2026, 6],
    [2026, 7],
  ];
  const todayKey = ymd(new Date());

  return (
    <div>
      <PageHeader
        title="🗓️ 데일리 학습 계획"
        desc="내일(6/29)부터 8월 말까지, 매일 스파르타 소설클럽이 토픽을 배정합니다."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="text-xs text-slate-500">하루 토픽 수</span>
        <select
          value={perDay}
          onChange={(e) => changePerDay(Number(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          {[5, 8, 10, 15, 20].map((n) => (
            <option key={n} value={n}>
              {n}개/일
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-slate-400">
          {PLAN_TOTAL_DAYS}일 · {covered}일간{" "}
          {Math.min(ordered.length, covered * perDay)}토픽 · 완료 {done.size}일
        </span>
      </div>

      <div className="space-y-6">
        {months.map(([y, m]) => {
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
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                {y}년 {m + 1}월
              </h3>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEK.map((w, i) => (
                  <div
                    key={w}
                    className={`pb-1 text-[11px] font-medium ${
                      i === 0
                        ? "text-rose-400"
                        : i === 6
                          ? "text-blue-400"
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
                  const isDone = done.has(key);
                  return (
                    <button
                      key={i}
                      disabled={!inRange}
                      onClick={() => setSelected(idx)}
                      className={`aspect-square rounded-lg border p-1 text-left transition ${
                        !inRange
                          ? "border-transparent text-slate-300"
                          : selected === idx
                            ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                            : isDone
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-slate-200 hover:border-brand-300"
                      } ${isToday ? "font-bold" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] ${isToday ? "text-brand-700" : "text-slate-600"}`}
                        >
                          {d.getDate()}
                        </span>
                        {isDone && (
                          <span className="text-[9px] text-emerald-600">✓</span>
                        )}
                      </div>
                      {inRange && (
                        <div className="mt-0.5 text-[9px] leading-tight text-slate-400">
                          {topicsForDay(ordered, idx, perDay).length}토픽
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected >= 0 && selected < covered && (
        <DayDetail
          idx={selected}
          date={dateOfDay(selected)}
          list={topicsForDay(ordered, selected, perDay)}
          done={done.has(ymd(dateOfDay(selected)))}
          onToggle={() => toggleDone(selected)}
        />
      )}
    </div>
  );
}

function DayDetail({
  idx,
  date,
  list,
  done,
  onToggle,
}: {
  idx: number;
  date: Date;
  list: PlanTopic[];
  done: boolean;
  onToggle: () => void;
}) {
  const isToday = ymd(date) === ymd(new Date());
  return (
    <div className="mt-6 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">
          {isToday && <span className="text-brand-600">오늘 · </span>}
          {date.getMonth() + 1}/{date.getDate()} ({WEEK[date.getDay()]}) · Day{" "}
          {idx + 1}
        </h3>
        <button
          onClick={onToggle}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            done
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {done ? "✓ 완료함" : "오늘 완료 체크"}
        </button>
      </div>
      <ol className="space-y-2">
        {list.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-bold text-slate-500">
              {i + 1}
            </span>
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
              {t.importance}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
              {t.title}
            </span>
            <span className="hidden text-[10px] text-slate-400 sm:inline">
              {t.category}
            </span>
            <Link
              href={mnemonicLink(t, true)}
              className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
            >
              🥷 학습
            </Link>
          </li>
        ))}
      </ol>
      <Link
        href="/commute"
        className="mt-3 inline-block text-xs font-medium text-brand-600 hover:underline"
      >
        🚇 지하철 모드로 오늘 토픽 카드 넘기기 →
      </Link>
    </div>
  );
}
