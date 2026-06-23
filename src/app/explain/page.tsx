"use client";

import { useState } from "react";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import Markdown from "@/components/Markdown";
import topics from "@/data/topics.json";

const levels = ["입문자", "수험생", "실무자"];

export default function ExplainPage() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("수험생");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!topic.trim()) {
      setError("토픽을 입력하거나 추천 토픽을 선택하세요.");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level }),
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
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예) 트랜스포머의 셀프 어텐션"
          className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="self-center text-xs text-slate-400">추천(중요도 상):</span>
          {topics.filter((t) => t.importance === "상").map((t) => (
            <button
              key={t.id}
              onClick={() => setTopic(t.title)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-600"
            >
              {t.title}
            </button>
          ))}
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
