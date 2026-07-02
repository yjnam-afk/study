"use client";

import { useEffect, useState } from "react";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import Markdown from "@/components/Markdown";
import TopicAutocomplete from "@/components/TopicAutocomplete";
import topics from "@/data/topics.json";

const levels = ["입문자", "수험생", "실무자"];

type Subnote = {
  mnemonic: string;
  keywords: string[];
  sections: { label: string; mnemonic: string; keywords: string[] }[];
  related: string[];
  classification: string;
  memo: string;
};

/** AI와 무관하게 항상 보여주는 교재 두음신공 블록(토큰 0, 검증된 데이터). */
function SubnoteBlock({ data }: { data: Subnote }) {
  const hasSections = data.sections?.length > 0;
  if (!hasSections && !data.memo) return null;
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-bold text-emerald-800">
          📌 교재 두음신공 (검증된 핵심)
        </span>
        {data.classification && (
          <span className="text-[11px] text-emerald-600">
            {data.classification}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {data.sections.map((s, i) => {
          const letters = [...(s.mnemonic || "").replace(/\s/g, "")];
          const aligned = letters.length === s.keywords.length;
          return (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-emerald-200 bg-white"
            >
              <div className="flex items-center justify-between bg-emerald-50 px-3 py-1.5">
                <span className="text-xs font-bold text-emerald-800">
                  {s.label}
                </span>
                <span className="text-base font-extrabold tracking-wide text-emerald-700">
                  {s.mnemonic}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {s.keywords.map((k, j) => (
                  <li
                    key={j}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-emerald-100 text-[11px] font-extrabold text-emerald-700">
                      {aligned ? letters[j] : j + 1}
                    </span>
                    <span className="text-slate-800">{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {data.memo && (
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-xs leading-relaxed text-slate-600">
          {data.memo}
        </div>
      )}
      {data.related?.length > 0 && (
        <div className="mt-2 text-xs text-emerald-700">
          🔗 연관: {data.related.join(" · ")}
        </div>
      )}
    </section>
  );
}

const CATS = Array.from(new Set(topics.map((t) => t.category)));
const IMP_ORDER: Record<string, number> = { 상: 0, 중: 1, 하: 2, 출제예상: 3 };

export default function ExplainPage() {
  const [topic, setTopic] = useState("");
  const [recCat, setRecCat] = useState(CATS[0]);
  const [level, setLevel] = useState("수험생");
  const [result, setResult] = useState("");
  const [subnote, setSubnote] = useState<Subnote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoPending, setAutoPending] = useState(false);

  // 학습 코치에서 ?topic=&auto= 으로 들어오면 미리 채우고 auto=1이면 즉시 생성.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const title = sp.get("topic") || "";
    if (title) {
      setTopic(title);
      const t = topics.find((x) => x.title === title);
      if (t) setRecCat(t.category);
      if (sp.get("auto") === "1") setAutoPending(true);
    }
  }, []);

  useEffect(() => {
    if (autoPending && topic.trim() && !loading) {
      setAutoPending(false);
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPending, topic]);

  async function generate() {
    if (!topic.trim()) {
      setError("토픽을 입력하거나 추천 토픽을 선택하세요.");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    setSubnote(null);
    try {
      const matched = topics.find((x) => x.title === topic.trim());
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level, topicId: matched?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      // AI 실패여도 교재 두음(subnote)은 함께 오므로 화면이 비지 않는다.
      if (data.subnote) setSubnote(data.subnote as Subnote);
      if (data.explanation) setResult(data.explanation);
      if (data.error) setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="💡 토픽 설명"
        desc="어려운 개념을 비유와 도식으로 이해하기 쉽게 설명합니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <TopicAutocomplete
          value={topic}
          onChange={(v) => setTopic(v)}
          onSelect={(t) => {
            setTopic(t.title);
            setRecCat(t.category);
          }}
          placeholder="토픽/키워드 입력 — 비슷한 토픽이 떠요"
        />

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-400">눈높이:</span>
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                level === l
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">토픽 선택:</span>
          <select
            value={recCat}
            onChange={(e) => setRecCat(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
          >
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            key={recCat}
            defaultValue=""
            onChange={(e) => e.target.value && setTopic(e.target.value)}
            className="min-w-[12rem] rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
          >
            <option value="" disabled>
              토픽 선택… ({topics.filter((t) => t.category === recCat).length}개)
            </option>
            {topics
              .filter((t) => t.category === recCat)
              .slice()
              .sort(
                (a, b) =>
                  (IMP_ORDER[a.importance] ?? 9) - (IMP_ORDER[b.importance] ?? 9),
              )
              .map((t) => (
                <option key={t.id} value={t.title}>
                  [{t.importance}] {t.title}
                </option>
              ))}
          </select>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={generate} disabled={loading}>
            {loading ? "설명 중…" : "설명 보기"}
          </Button>
          {topic.trim() && (
            <a
              href={`/mnemonic?topic=${encodeURIComponent(topic.trim())}${
                topics.find((x) => x.title === topic.trim())
                  ? `&topicId=${topics.find((x) => x.title === topic.trim())!.id}`
                  : ""
              }&auto=1`}
              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              🥷 이 토픽 두음신공 학습 →
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading && <Spinner label="이해하기 쉽게 정리하고 있습니다…" />}
        {error && <ErrorBox message={error} />}
        {subnote && <SubnoteBlock data={subnote} />}
        {result && (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <Markdown>{result}</Markdown>
          </article>
        )}
        {(result || subnote) && topic.trim() && (
          <a
            href={`/mnemonic?topic=${encodeURIComponent(topic.trim())}${
              topics.find((x) => x.title === topic.trim())
                ? `&topicId=${topics.find((x) => x.title === topic.trim())!.id}`
                : ""
            }&auto=1`}
            className="inline-block rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
          >
            🥷 이 토픽 두음신공으로 더 깊이 학습 →
          </a>
        )}
      </div>
    </div>
  );
}
