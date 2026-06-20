"use client";

import { useState } from "react";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import Markdown from "@/components/Markdown";
import questions from "@/data/questions.json";

type Period = "1교시" | "2교시";

export default function AnswerPage() {
  const [period, setPeriod] = useState<Period>("1교시");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const samples = questions.filter((q) => q.period === period);

  async function generate() {
    if (!question.trim()) {
      setError("문제를 입력하거나 샘플을 선택하세요.");
      return;
    }
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      setAnswer(data.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="📝 답안지 생성"
        desc="교시를 선택하고 문제를 입력하면 시험 답안지 형식으로 작성해 줍니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex rounded-lg border border-slate-200 p-1">
          {(["1교시", "2교시"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                period === p
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p} {p === "1교시" ? "(용어형)" : "(서술형)"}
            </button>
          ))}
        </div>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder={
            period === "1교시"
              ? "예) CAP 이론에 대해 설명하시오."
              : "예) MSA 전환 시 고려사항과 전략을 설명하시오."
          }
          className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="self-center text-xs text-slate-400">샘플 문제:</span>
          {samples.map((q) => (
            <button
              key={q.id}
              onClick={() => setQuestion(q.text)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-600"
            >
              {q.text.length > 24 ? q.text.slice(0, 24) + "…" : q.text}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <Button onClick={generate} disabled={loading}>
            {loading ? "작성 중…" : "답안 생성"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {loading && <Spinner label="시험 답안지를 작성하고 있습니다…" />}
        {error && <ErrorBox message={error} />}
        {answer && (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <Markdown>{answer}</Markdown>
          </article>
        )}
      </div>
    </div>
  );
}
