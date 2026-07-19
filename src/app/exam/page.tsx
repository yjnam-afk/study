"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import Markdown from "@/components/Markdown";
import CopyButton from "@/components/CopyButton";
import questions from "@/data/questions.json";
import { getModelAnswer } from "@/lib/modelAnswers";

type Q = {
  id: string;
  period: string;
  category: string;
  text: string;
  source?: string;
  /** 구분 — 없으면 실제 기출. */
  kind?: "기출" | "셀테" | "모의고사" | "예상";
  /** 회차/주차 라벨(명시적). 없으면 source 앞토큰. */
  round?: string;
};

// source(회차) 또는 kind가 있는 문제(기출·셀테·모의고사·예상)를 모은다.
const EXAMS = (questions as Q[]).filter((q) => q.source || q.kind);

function kindOf(q: Q): "기출" | "셀테" | "모의고사" | "예상" {
  return q.kind || "기출";
}
// "139회 1교시" → 회차 "139회". round가 있으면 그대로.
function roundOf(q: Q): string {
  return q.round || (q.source || "").split(" ")[0] || "기타";
}

// 데이터에 실제 존재하는 구분만 탭으로. 기출 → 셀테 → 모의고사 → 예상 순.
const KIND_ORDER: Record<string, number> = { 기출: 0, 셀테: 1, 모의고사: 2, 예상: 3 };
const KINDS = Array.from(new Set(EXAMS.map(kindOf))).sort(
  (a, b) => (KIND_ORDER[a] ?? 9) - (KIND_ORDER[b] ?? 9),
);
const KIND_DESC: Record<string, string> = {
  기출: "실제 정보관리기술사 기출문제입니다. 문제를 골라 바로 답안 '소설'을 연습해 보세요.",
  셀테: "주차별 실전 셀프테스트(셀테)입니다. 시험처럼 골라 답안을 연습해 보세요.",
  모의고사: "실전 명품 모의고사입니다. 교시별로 실제 시험처럼 풀어 보세요.",
  예상: "출제 흐름(AI·클라우드·보안·데이터)을 반영해 만든 예상문제입니다. 참고용으로 연습하세요.",
};

// 회차 정렬: 숫자(회/주차) 큰 순.
function roundNum(r: string): number {
  const m = r.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}
const PERIODS = ["전체", "1교시", "2교시", "3교시", "4교시"] as const;

function answerLink(q: Q): string {
  // 답안 유형: 1교시=용어형 단답, 2·3·4교시=서술형(작성 방법론 동일).
  const period = q.period === "1교시" ? "1교시" : "2교시";
  return `/answer?period=${encodeURIComponent(period)}&question=${encodeURIComponent(q.text)}`;
}

const KIND_LABEL: Record<string, string> = {
  기출: "📜 기출",
  셀테: "📝 셀테",
  모의고사: "🏆 모의고사",
  예상: "🔮 예상",
};

// 구분의 가장 최신(숫자 큰) 회차/주차. 기본으로 이것만 렌더 → '전체'로 수백 문제를
// 한 번에 그려 느려지던 문제 해소(원하면 회차에서 '전체' 선택 가능).
function newestRound(k: string): string {
  const rs = Array.from(
    new Set(EXAMS.filter((q) => kindOf(q) === k).map(roundOf)),
  ).sort((a, b) => roundNum(b) - roundNum(a));
  return rs[0] || "전체";
}

export default function ExamPage() {
  const [kind, setKind] = useState<string>(KINDS[0] || "기출");
  const [round, setRound] = useState<string>(() => newestRound(KINDS[0] || "기출"));
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("전체");

  // 선택 구분에 존재하는 회차/주차만.
  const rounds = useMemo(
    () =>
      Array.from(
        new Set(EXAMS.filter((q) => kindOf(q) === kind).map(roundOf)),
      ).sort((a, b) => roundNum(b) - roundNum(a)),
    [kind],
  );

  // 선택 구분에 실제 존재하는 교시만 노출(셀테는 3·4교시가 없음).
  const periods = useMemo(() => {
    const have = new Set(
      EXAMS.filter((q) => kindOf(q) === kind).map((q) => q.period),
    );
    return [
      "전체",
      ...(["1교시", "2교시", "3교시", "4교시"] as const).filter((p) =>
        have.has(p),
      ),
    ] as (typeof PERIODS)[number][];
  }, [kind]);

  const list = useMemo(
    () =>
      EXAMS.filter(
        (q) =>
          kindOf(q) === kind &&
          (round === "전체" || roundOf(q) === round) &&
          (period === "전체" || q.period === period),
      ),
    [kind, round, period],
  );

  // 페이지네이션 — 처음엔 일부만 렌더(수백 문제를 한 번에 그리지 않게). 필터가 바뀌면 리셋.
  const PAGE = 20;
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => setVisible(PAGE), [kind, round, period]);
  const capped = useMemo(() => list.slice(0, visible), [list, visible]);

  // 교시별 그룹(현재 렌더 대상 capped 기준)
  const groups = useMemo(() => {
    const map = new Map<string, Q[]>();
    for (const q of capped) {
      const key = `${roundOf(q)} · ${q.period}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const [ra, pa] = a[0].split(" · ");
      const [rb, pb] = b[0].split(" · ");
      return roundNum(rb) - roundNum(ra) || pa.localeCompare(pb);
    });
  }, [capped]);

  return (
    <div>
      <PageHeader title="📜 문제 풀이" desc={KIND_DESC[kind]} />

      {KINDS.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                setRound(newestRound(k));
                setPeriod("전체");
              }}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
                kind === k
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 active:bg-slate-200"
              }`}
            >
              {KIND_LABEL[k] || k}
            </button>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {kind === "셀테" ? "주차" : "회차"}
          </span>
          <select
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
          >
            <option value="전체">전체</option>
            {rounds.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                period === p
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">
          {Math.min(visible, list.length)}/{list.length}문제
        </span>
      </div>

      {groups.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          해당 조건의 문제가 없습니다.
        </p>
      )}

      <div className="space-y-6">
        {groups.map(([key, qs]) => (
          <section key={key}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                {key}
              </span>
              <span className="text-xs font-normal text-slate-400">
                {qs.length}문제
              </span>
            </h3>
            <div className="space-y-2">
              {qs.map((q, i) => {
                const ma = getModelAnswer(q.id);
                return (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">
                        {q.text}
                      </p>
                      <span className="mt-1 inline-block rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                        {q.category}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 pl-9">
                    {ma && (
                      <span className="self-center rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                        📘 모범답안 제공
                      </span>
                    )}
                    <Link
                      href={answerLink(q)}
                      className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      ✍️ 이 문제로 답안 연습 →
                    </Link>
                    <CopyButton
                      text={q.text}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    />
                  </div>

                  {ma && (
                    <details className="mt-3 pl-9">
                      <summary className="cursor-pointer text-xs font-semibold text-amber-700 hover:underline">
                        📘 클로드 모범답안 보기
                      </summary>
                      <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                        <div className="mb-2 rounded-md bg-white px-2.5 py-1 text-[10px] text-amber-700 ring-1 ring-amber-200">
                          🧾 근거: {ma.source}
                        </div>
                        <article className="rounded-lg bg-white p-4">
                          <Markdown>{ma.answer}</Markdown>
                        </article>
                      </div>
                    </details>
                  )}
                </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {list.length > visible && (
        <div className="mt-5 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            더 보기 (+{Math.min(PAGE, list.length - visible)}) · 남은 {list.length - visible}문제
          </button>
        </div>
      )}

      <p className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-400">
        기출문제는 계속 추가됩니다. 답안 작성 시 토픽을 연결하면 서브노트 내용을
        근거로 더 정확한 답안이 생성됩니다.
      </p>
    </div>
  );
}
