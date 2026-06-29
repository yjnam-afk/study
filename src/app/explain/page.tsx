"use client";

import { useEffect, useState } from "react";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import Markdown from "@/components/Markdown";
import TopicAutocomplete from "@/components/TopicAutocomplete";
import topics from "@/data/topics.json";

const levels = ["입문자", "수험생", "실무자"];

const CATS = Array.from(new Set(topics.map((t) => t.category)));
const IMP_ORDER: Record<string, number> = { 상: 0, 중: 1, 하: 2, 출제예상: 3 };

export default function ExplainPage() {
  const [topic, setTopic] = useState("");
  const [recCat, setRecCat] = useState(CATS[0]);
  const [level, setLevel] = useState("수험생");
  const [result, setResult] = useState("");
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
    try {
      const matched = topics.find((x) => x.title === topic.trim());
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level, topicId: matched?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      setResult(data.explanation);
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

        <div className="mt-5">
          <Button onClick={generate} disabled={loading}>
            {loading ? "설명 중…" : "설명 보기"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {loading && <Spinner label="이해하기 쉽게 정리하고 있습니다…" />}
        {error && <ErrorBox message={error} />}
        {result && (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <Markdown>{result}</Markdown>
          </article>
        )}
      </div>
    </div>
  );
}
