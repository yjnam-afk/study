"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";
import ShareButton from "@/components/ShareButton";
import CopyButton from "@/components/CopyButton";
import questions from "@/data/questions.json";

type Q = {
  id: string;
  period: string;
  category: string;
  text: string;
  source?: string;
  kind?: "기출" | "셀테" | "모의고사" | "예상";
  round?: string;
};

// 출처(회차/주차)가 있는 문제 = 기출·셀테·모의고사 전부.
const POOL = (questions as Q[]).filter((q) => q.source || q.kind);
const kindOf = (q: Q): "기출" | "셀테" | "모의고사" | "예상" => q.kind || "기출";
const roundOf = (q: Q) => q.round || (q.source || "").split(" ")[0] || "";

const KINDS = ["기출", "모의고사", "셀테", "예상"] as const;
const KIND_BADGE: Record<string, string> = {
  기출: "bg-amber-100 text-amber-700",
  모의고사: "bg-rose-100 text-rose-700",
  셀테: "bg-violet-100 text-violet-700",
  예상: "bg-emerald-100 text-emerald-700",
};

// 교시 모드: 1교시(용어형) / 2교시(서술형 — 2·3·4교시 포함).
const MODES = [
  { key: "1교시", label: "1교시 (용어형)", periods: ["1교시"], presets: [6, 10, 13], def: 10 },
  {
    key: "2교시",
    label: "2교시 (서술형)",
    periods: ["2교시", "3교시", "4교시"],
    presets: [3, 4, 6],
    def: 4,
  },
] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BankPage() {
  const [mode, setMode] = useState<(typeof MODES)[number]>(MODES[0]);
  const [count, setCount] = useState<number>(MODES[0].def);
  const [srcs, setSrcs] = useState<Set<string>>(new Set(KINDS));
  const [drawn, setDrawn] = useState<Q[]>([]);
  const [drew, setDrew] = useState(false);

  // 현재 조건(교시·출처)에 맞는 후보 풀.
  const candidates = useMemo(
    () =>
      POOL.filter(
        (q) => (mode.periods as readonly string[]).includes(q.period) && srcs.has(kindOf(q)),
      ),
    [mode, srcs],
  );

  function draw() {
    setDrawn(shuffle(candidates).slice(0, Math.min(count, candidates.length)));
    setDrew(true);
  }

  function toggleSrc(k: string) {
    const next = new Set(srcs);
    next.has(k) ? next.delete(k) : next.add(k);
    if (next.size === 0) return; // 최소 1개 유지
    setSrcs(next);
  }

  function pickMode(m: (typeof MODES)[number]) {
    setMode(m);
    setCount(m.def);
    setDrew(false);
    setDrawn([]);
  }

  const answerPeriod = mode.key === "1교시" ? "1교시" : "2교시";

  return (
    <div>
      <PageHeader
        title="🏦 문제은행"
        desc="교시와 문항 수를 고르면 기출·모의고사·셀테에서 랜덤으로 뽑아 실전처럼 출제합니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* 교시 */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold text-slate-500">교시</div>
          <div className="inline-flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => pickMode(m)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode.key === m.key
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 출처 */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold text-slate-500">
            출처 (뽑을 곳)
          </div>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => {
              const on = srcs.has(k);
              const n = POOL.filter(
                (q) => (mode.periods as readonly string[]).includes(q.period) && kindOf(q) === k,
              ).length;
              return (
                <button
                  key={k}
                  onClick={() => toggleSrc(k)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    on
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {k} <span className="opacity-60">({n})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 문항 수 */}
        <div className="mb-5">
          <div className="mb-2 text-xs font-semibold text-slate-500">
            문항 수 <span className="text-slate-400">· 후보 {candidates.length}문제</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode.presets.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  count === n
                    ? "bg-slate-800 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {n}문제
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={Math.max(1, candidates.length)}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(Number(e.target.value) || 1, candidates.length)))
              }
              className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <Button onClick={draw} disabled={candidates.length === 0}>
          {drew ? "🔀 다시 뽑기" : "🎲 문제 뽑기"}
        </Button>
        {candidates.length === 0 && (
          <p className="mt-2 text-xs text-rose-500">
            선택한 조건에 해당하는 문제가 없어요. 출처를 더 켜보세요.
          </p>
        )}
      </div>

      {/* 출제 결과 — 실전 시험지처럼 */}
      {drawn.length > 0 && (
        <div className="mt-6 rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                📝 {mode.label} · 랜덤 {drawn.length}문제
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {mode.key === "1교시"
                  ? "각 문제를 용어형(약 1페이지)으로 — 실제 시험은 10문제 중 택하여 작성"
                  : "각 문제를 서술형(2~3페이지)으로 — 실제 시험은 4문제 중 택하여 작성"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton
                label="전체 복사"
                text={
                  `[${mode.label}] 랜덤 ${drawn.length}문제\n\n` +
                  drawn.map((q, i) => `${i + 1}. ${q.text}`).join("\n\n")
                }
              />
              <ShareButton
                title="[다 같이 스파르타] 문제은행 랜덤 출제"
                text={
                  `📝 ${mode.label} 랜덤 ${drawn.length}문제\n\n` +
                  drawn.map((q, i) => `${i + 1}. ${q.text.split("\n")[0]}`).join("\n")
                }
              />
            </div>
          </div>

          <ol className="space-y-4">
            {drawn.map((q, i) => (
              <li key={q.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">
                      {q.text}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${KIND_BADGE[kindOf(q)]}`}
                      >
                        {kindOf(q)}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {roundOf(q)} · {q.period}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {q.category}
                      </span>
                      <CopyButton
                        text={q.text}
                        className="ml-auto rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
                      />
                      <Link
                        href={`/answer?period=${encodeURIComponent(answerPeriod)}&question=${encodeURIComponent(q.text)}`}
                        className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700"
                      >
                        ✍️ 답안 연습 →
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 text-center">
            <Button onClick={draw}>🔀 다시 뽑기</Button>
          </div>
        </div>
      )}
    </div>
  );
}
