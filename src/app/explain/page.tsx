"use client";

import { readJsonSafe } from "@/lib/safeJson";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import Markdown from "@/components/Markdown";
import ConceptDiagram from "@/components/ConceptDiagram";
import ShareButton from "@/components/ShareButton";
import AudioLecture from "@/components/AudioLecture";
import TopicAutocomplete from "@/components/TopicAutocomplete";
import topics from "@/data/topics.json";

const levels = ["입문자", "수험생", "실무자"];

const CATS = Array.from(new Set(topics.map((t) => t.category)));
const IMP_ORDER: Record<string, number> = { 상: 0, 중: 1, 하: 2, 출제예상: 3 };

function ExplainInner() {
  const [topic, setTopic] = useState("");
  const [recCat, setRecCat] = useState(CATS[0]);
  const [level, setLevel] = useState("수험생");
  const [result, setResult] = useState("");
  const [conceptMap, setConceptMap] = useState("");
  const [conceptTopicId, setConceptTopicId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoPending, setAutoPending] = useState(false);

  // 학습 코치 등에서 ?topic=&auto= 으로 들어오면 미리 채우고 auto=1이면 즉시 생성.
  // SPA 이동으로 쿼리만 바뀌어도 반응하도록 searchParams 의존.
  const searchParams = useSearchParams();
  useEffect(() => {
    const title = searchParams.get("topic") || "";
    if (title) {
      setTopic(title);
      const t = topics.find((x) => x.title === title);
      if (t) setRecCat(t.category);
      if (searchParams.get("auto") === "1") setAutoPending(true);
    }
  }, [searchParams]);

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
    setConceptMap("");
    setConceptTopicId(undefined);
    try {
      const matched = topics.find((x) => x.title === topic.trim());
      setConceptTopicId(matched?.id);
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level, topicId: matched?.id }),
      });
      const { ok, data } = await readJsonSafe(res);
      if (!ok) throw new Error((data.error as string) || "생성 실패");
      setResult(data.explanation as string);
      setConceptMap((data.conceptMap as string) || "");
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
            <Link
              href={`/mnemonic?topic=${encodeURIComponent(topic.trim())}${
                topics.find((x) => x.title === topic.trim())
                  ? `&topicId=${topics.find((x) => x.title === topic.trim())!.id}`
                  : ""
              }&auto=1`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-slate-100"
            >
              🥷 이 토픽 두음신공 학습 →
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6">
        {loading && <Spinner label="이해하기 쉽게 정리하고 있습니다…" />}
        {error && <ErrorBox message={error} />}
        {result && (
          <>
            {/* 오디오 강의·공유 — 두음신공 페이지와 동일하게 결과 상단(카드 밖) */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <AudioLecture
                topic={topic.trim()}
                topicId={topics.find((x) => x.title === topic.trim())?.id}
              />
              <ShareButton
                title={`[말랑말랑 스파르타] ${topic.trim()} 설명`}
                text={`💡 ${topic.trim()} — 이해하기 쉬운 설명`}
                url={`https://study-teal-eight.vercel.app/explain?topic=${encodeURIComponent(topic.trim())}&auto=1`}
              />
            </div>
            {/* 개념도 — 실제 교재 이미지(public/concept/<id>.svg|png) 우선, 없으면 mermaid 폴백 */}
            <ConceptDiagram topicId={conceptTopicId} chart={conceptMap} />
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <Markdown>{result}</Markdown>
            </article>
          </>
        )}
      </div>
    </div>
  );
}

// useSearchParams는 Suspense 경계가 필요하다(Next App Router).
export default function ExplainPage() {
  return (
    <Suspense fallback={null}>
      <ExplainInner />
    </Suspense>
  );
}
