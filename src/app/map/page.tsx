"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import topics from "@/data/topics.json";
import { compareSets } from "@/data/compareSets";
import { memoryTables } from "@/data/memoryTables";

type Topic = {
  id: string;
  title: string;
  category: string;
  group: string;
  importance: string;
  summary: string;
};

const ALL = topics as Topic[];
const CATS = Array.from(new Set(ALL.map((t) => t.category)));
const IMP_ORDER: Record<string, number> = { 상: 0, 중: 1, 하: 2, 출제예상: 3 };

const IMP_BADGE: Record<string, string> = {
  상: "border-amber-300 bg-amber-50 text-amber-700",
  중: "border-slate-200 bg-slate-50 text-slate-600",
  하: "border-slate-200 bg-white text-slate-400",
  출제예상: "border-brand-200 bg-brand-50 text-brand-600",
};

/** 한 묶음(group)에 속한 토픽들을 중요도 순으로 정렬해 반환 */
function groupsOf(items: Topic[]): { name: string; items: Topic[] }[] {
  const byGroup = new Map<string, Topic[]>();
  for (const t of items) {
    const key = t.group || "(기타)";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(t);
  }
  return Array.from(byGroup.entries())
    .map(([name, list]) => ({
      name,
      items: list
        .slice()
        .sort(
          (a, b) =>
            (IMP_ORDER[a.importance] ?? 9) - (IMP_ORDER[b.importance] ?? 9) ||
            a.title.localeCompare(b.title, "ko"),
        ),
    }))
    // 토픽 많은 묶음(핵심 클러스터)을 먼저, 같으면 이름순
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name, "ko"));
}

const CMP_CATS = Array.from(new Set(compareSets.map((s) => s.category)));
const TBL_CATS = Array.from(new Set(memoryTables.map((t) => t.category)));
// 묶음 이름의 개행·중복공백 정규화(표시용) — 데이터엔 "병행 제어\n(...)" 같은 값이 섞여 있다.
const cleanGroup = (name: string) => name.replace(/\s+/g, " ").trim();
const explainHref = (name: string) =>
  `/explain?topic=${encodeURIComponent(name)}&auto=1`;

export default function MapPage() {
  const [view, setView] = useState<"compare" | "tables" | "groups">("compare");
  const [cat, setCat] = useState(CATS[0]);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const query = q.trim().toLowerCase();
  const searching = query.length > 0;

  // 비교 세트: 검색 중이면 전 분류에서 매칭, 아니면 전체(카드에 분류 배지 표시)
  const cmpResults = useMemo(() => {
    if (!searching) return compareSets;
    return compareSets.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.axis.toLowerCase().includes(query) ||
        s.items.some((it) => it.name.toLowerCase().includes(query)),
    );
  }, [query, searching]);

  // 암기표: 제목·설명·표 내용에서 매칭
  const tblResults = useMemo(() => {
    if (!searching) return memoryTables;
    return memoryTables.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.intro.toLowerCase().includes(query) ||
        t.rows.some((r) => r.join(" ").toLowerCase().includes(query)),
    );
  }, [query, searching]);

  // 검색 중이면 전 분류에서 제목/요약 매칭, 아니면 선택 분류 전체
  const scope = useMemo(() => {
    if (!searching) return ALL.filter((t) => t.category === cat);
    return ALL.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.summary || "").toLowerCase().includes(query) ||
        (t.group || "").toLowerCase().includes(query),
    );
  }, [cat, query, searching]);

  const groups = useMemo(() => groupsOf(scope), [scope]);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="🗺️ 토픽 지도"
        desc="개념을 나란히 비교하거나(⚖️), 묶음을 한 장의 표로 통째 암기하거나(📋), 연관 토픽을 묶음으로 모아 봅니다(🗺️)."
      />

      {/* 뷰 전환 */}
      <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {[
          { k: "compare" as const, label: "⚖️ 비교하며 외우기" },
          { k: "tables" as const, label: "📋 암기표" },
          { k: "groups" as const, label: "🗺️ 주제 묶음" },
        ].map((v) => (
          <button
            key={v.k}
            onClick={() => setView(v.k)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              view === v.k
                ? "bg-white text-brand-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            view === "compare"
              ? "비교 세트 검색… (예: 정규화, 대칭키, OSI, 학습)"
              : view === "tables"
                ? "암기표 검색… (예: 정렬, OSI, 정규형, RAID)"
                : "토픽·요약·묶음 검색… (예: 정규화, 감리, TCP)"
          }
          className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {view === "compare" ? (
        <CompareView cmpResults={cmpResults} q={q} searching={searching} />
      ) : view === "tables" ? (
        <TablesView tblResults={tblResults} q={q} searching={searching} />
      ) : (
        <GroupsView
          cat={cat}
          setCat={setCat}
          q={q}
          searching={searching}
          scope={scope}
          groups={groups}
          expanded={expanded}
          setExpanded={setExpanded}
          toggle={toggle}
        />
      )}
    </div>
  );
}

/* ─────────────── 비교 뷰 ─────────────── */
function CompareView({
  cmpResults,
  q,
  searching,
}: {
  cmpResults: typeof compareSets;
  q: string;
  searching: boolean;
}) {
  const [pick, setPick] = useState<string>("전체");
  // 검색 중엔 분류 필터 무시, 아니면 선택 분류로 좁힘
  const shown =
    searching || pick === "전체"
      ? cmpResults
      : cmpResults.filter((s) => s.category === pick);
  const cats = CMP_CATS.filter((c) => shown.some((s) => s.category === c));

  return (
    <div>
      {/* 분류 바로가기 (검색 중엔 숨김) */}
      {!searching && (
        <div className="mb-4 flex flex-wrap gap-2">
          {["전체", ...CMP_CATS].map((c) => {
            const n =
              c === "전체"
                ? compareSets.length
                : compareSets.filter((s) => s.category === c).length;
            const active = c === pick;
            return (
              <button
                key={c}
                onClick={() => setPick(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                }`}
              >
                {c}{" "}
                <span className={active ? "text-brand-100" : "text-slate-400"}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mb-3 text-xs text-slate-400">
        {searching
          ? `"${q}" 검색 결과 · 비교 세트 ${cmpResults.length}개`
          : `견주며 외우는 핵심 비교 ${compareSets.length}세트 · 항목을 누르면 AI 설명으로 이동`}
      </p>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-6">
          {cats.map((c) => (
            <div key={c}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                {c}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {shown
                  .filter((s) => s.category === c)
                  .map((s) => (
                    <section
                      key={`${s.category}::${s.title}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <h3 className="text-sm font-bold text-slate-900">
                        {s.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-brand-600">⚖️ {s.axis}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.items.map((it) => (
                          <Link
                            key={it.name}
                            href={explainHref(it.name)}
                            className="group min-w-[130px] flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 transition hover:border-brand-300 hover:bg-brand-50"
                          >
                            <div className="text-[13px] font-semibold leading-snug text-slate-800 group-hover:text-brand-600">
                              {it.name}
                            </div>
                            <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
                              {it.hint}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── 암기표 뷰 ─────────────── */
function TablesView({
  tblResults,
  q,
  searching,
}: {
  tblResults: typeof memoryTables;
  q: string;
  searching: boolean;
}) {
  const [pick, setPick] = useState<string>("전체");
  const shown =
    searching || pick === "전체"
      ? tblResults
      : tblResults.filter((t) => t.category === pick);

  return (
    <div>
      {!searching && (
        <div className="mb-4 flex flex-wrap gap-2">
          {["전체", ...TBL_CATS].map((c) => {
            const n =
              c === "전체"
                ? memoryTables.length
                : memoryTables.filter((t) => t.category === c).length;
            const active = c === pick;
            return (
              <button
                key={c}
                onClick={() => setPick(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                }`}
              >
                {c}{" "}
                <span className={active ? "text-brand-100" : "text-slate-400"}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mb-3 text-xs text-slate-400">
        {searching
          ? `"${q}" 검색 결과 · 암기표 ${tblResults.length}개`
          : `묶음을 한 장에 통째로 외우는 암기표 ${memoryTables.length}개 · 답안에 그대로 옮겨 적기 좋아요`}
      </p>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((t) => (
            <section
              key={`${t.category}::${t.title}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    {t.category}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {t.intro}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      {t.columns.map((col, i) => (
                        <th
                          key={i}
                          className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, ri) => (
                      <tr key={ri} className="even:bg-slate-50/40">
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className={`border-b border-slate-100 px-3 py-2 align-top ${
                              ci === 0
                                ? "whitespace-nowrap font-semibold text-slate-800"
                                : "text-slate-600"
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {t.examTip && (
                <p className="border-t border-amber-100 bg-amber-50/50 px-4 py-2.5 text-xs leading-relaxed text-amber-800">
                  ✍️ <b className="font-semibold">답안 활용</b> · {t.examTip}
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── 묶음 뷰 (기존) ─────────────── */
function GroupsView({
  cat,
  setCat,
  q,
  searching,
  scope,
  groups,
  expanded,
  setExpanded,
  toggle,
}: {
  cat: string;
  setCat: (c: string) => void;
  q: string;
  searching: boolean;
  scope: Topic[];
  groups: { name: string; items: Topic[] }[];
  expanded: Set<string>;
  setExpanded: Dispatch<SetStateAction<Set<string>>>;
  toggle: (key: string) => void;
}) {
  return (
    <div>
      {/* 분류 탭 (검색 중엔 숨김) */}
      {!searching && (
        <div className="mb-5 flex flex-wrap gap-2">
          {CATS.map((c) => {
            const n = ALL.filter((t) => t.category === c).length;
            const active = c === cat;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                }`}
              >
                {c} <span className={active ? "text-brand-100" : "text-slate-400"}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 요약 줄 + 전체 펼치기/접기 */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">
          {searching
            ? `"${q}" 검색 결과 · 토픽 ${scope.length}개 · 묶음 ${groups.length}개`
            : `${cat} · 토픽 ${scope.length}개 · 연관 묶음 ${groups.length}개`}
        </span>
        {!searching && groups.length > 0 && (
          <button
            onClick={() =>
              setExpanded((prev) =>
                prev.size >= groups.length
                  ? new Set()
                  : new Set(groups.map((g) => `${cat}::${g.name}`)),
              )
            }
            className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
          >
            {expanded.size >= groups.length ? "모두 접기" : "모두 펼치기"}
          </button>
        )}
      </div>

      {/* 묶음 목록 */}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const key = `${cat}::${g.name}`;
            // 검색 중엔 항상 펼침, 평소엔 기본 접힘 → 클릭 시 펼침
            const open = searching || expanded.has(key);
            return (
              <section
                key={key}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  onClick={() => toggle(key)}
                  disabled={searching}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 disabled:cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{open ? "▾" : "▸"}</span>
                    <h3 className="font-semibold text-slate-900">{cleanGroup(g.name)}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {g.items.length}
                    </span>
                  </div>
                  {searching && (
                    <span className="text-xs text-slate-400">{g.items[0]?.category}</span>
                  )}
                </button>

                {open && (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {g.items.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/explain?topic=${encodeURIComponent(t.title)}&auto=1`}
                          className="group flex items-start gap-3 px-5 py-3 transition hover:bg-brand-50/50"
                        >
                          <span
                            className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                              IMP_BADGE[t.importance] || IMP_BADGE["중"]
                            }`}
                          >
                            {t.importance}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 group-hover:text-brand-600">
                              {t.title}
                            </div>
                            {t.summary && (
                              <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                {t.summary}
                              </div>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
