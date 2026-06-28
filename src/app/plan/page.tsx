"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import topics from "@/data/topics.json";
import { mnemonicLink } from "@/lib/coach";

type Topic = {
  id: string;
  title: string;
  category: string;
  importance: string;
};

const IMP: Record<string, number> = { 상: 0, 중: 1, 출제예상: 2, 하: 3 };
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// 학습 기간: 2026-06-29(내일) ~ 2026-08-31
const START = new Date(2026, 5, 29);
const END = new Date(2026, 7, 31);
const DAY = 86400000;
const TOTAL_DAYS = Math.round((END.getTime() - START.getTime()) / DAY) + 1;

const DONE_KEY = "info-pe-plan-done-v1";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** 중요도 우선 + 도메인 라운드로빈으로 토픽 순서를 정한다(매일 다양한 분야). */
function orderedTopics(): Topic[] {
  const all = topics as Topic[];
  const tiers = ["상", "중", "출제예상", "하"];
  const out: Topic[] = [];
  for (const tier of tiers) {
    const inTier = all.filter((t) => t.importance === tier);
    const byCat: Record<string, Topic[]> = {};
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

export default function PlanPage() {
  const [perDay, setPerDay] = useState(10);
  const [selected, setSelected] = useState<number>(-1); // 선택한 dayIndex
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DONE_KEY);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
    // 오늘이 기간 내면 오늘 선택
    const todayIdx = Math.round((Date.now() - START.getTime()) / DAY);
    setSelected(todayIdx >= 0 && todayIdx < TOTAL_DAYS ? todayIdx : 0);
  }, []);

  const ordered = useMemo(() => orderedTopics(), []);

  function dayTopics(idx: number): Topic[] {
    return ordered.slice(idx * perDay, idx * perDay + perDay);
  }
  function dateOf(idx: number): Date {
    return new Date(START.getTime() + idx * DAY);
  }
  const coveredDays = Math.min(TOTAL_DAYS, Math.ceil(ordered.length / perDay));

  function toggleDone(idx: number) {
    const key = ymd(dateOf(idx));
    const next = new Set(done);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDone(next);
    localStorage.setItem(DONE_KEY, JSON.stringify([...next]));
  }

  // 렌더할 달: 2026-06, 07, 08
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
          onChange={(e) => setPerDay(Number(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          {[5, 8, 10, 15, 20].map((n) => (
            <option key={n} value={n}>
              {n}개/일
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-slate-400">
          {TOTAL_DAYS}일 · {coveredDays}일간 {Math.min(ordered.length, coveredDays * perDay)}토픽 ·
          완료 {done.size}일
        </span>
      </div>

      {/* 달력들 */}
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
                      i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-slate-400"
                    }`}
                  >
                    {w}
                  </div>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const idx = Math.round((d.getTime() - START.getTime()) / DAY);
                  const inRange = idx >= 0 && idx < coveredDays;
                  const key = ymd(d);
                  const isToday = key === todayKey;
                  const isDone = done.has(key);
                  const cnt = inRange ? dayTopics(idx).length : 0;
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
                        {isDone && <span className="text-[9px] text-emerald-600">✓</span>}
                      </div>
                      {inRange && (
                        <div className="mt-0.5 text-[9px] leading-tight text-slate-400">
                          {cnt}토픽
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

      {/* 선택한 날의 토픽 */}
      {selected >= 0 && selected < coveredDays && (
        <DayDetail
          idx={selected}
          date={dateOf(selected)}
          list={dayTopics(selected)}
          done={done.has(ymd(dateOf(selected)))}
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
  list: Topic[];
  done: boolean;
  onToggle: () => void;
}) {
  const isToday = ymd(date) === ymd(new Date());
  return (
    <div className="mt-6 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">
          {isToday && <span className="text-brand-600">오늘 · </span>}
          {date.getMonth() + 1}/{date.getDate()} ({WEEK[date.getDay()]}) · Day {idx + 1}
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
