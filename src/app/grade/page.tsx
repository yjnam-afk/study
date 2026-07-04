"use client";

import { readJsonSafe } from "@/lib/safeJson";
import { useEffect, useState } from "react";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import Markdown from "@/components/Markdown";
import questions from "@/data/questions.json";

type Period = "1교시" | "2교시";

export default function GradePage() {
  const [period, setPeriod] = useState<Period>("1교시");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [reference, setReference] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 기출문제 메뉴에서 ?period=&question= 으로 들어오면 미리 채운다.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get("period");
    if (p === "1교시" || p === "2교시") setPeriod(p);
    const q = sp.get("question");
    if (q) setQuestion(q);
  }, []);

  const samples = questions.filter((q) => q.period === period);

  async function grade() {
    if (!question.trim()) {
      setError("문제를 입력하거나 샘플을 선택하세요.");
      return;
    }
    if (!answer.trim()) {
      setError("채점할 본인 답안을 입력하세요.");
      return;
    }
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, question, answer, reference }),
      });
      const { ok, data } = await readJsonSafe(res);
      if (!ok) throw new Error((data.error as string) || "채점 실패");
      setFeedback(data.feedback as typeof feedback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="✅ AI 자가채점"
        desc="내가 쓴 답안을 붙여넣으면 채점위원 관점에서 점수와 보완점을 알려줍니다."
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

        <label className="mb-1 block text-xs font-medium text-slate-500">
          문제
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder={
            period === "1교시"
              ? "예) CAP 이론에 대해 설명하시오."
              : "예) MSA 전환 시 고려사항과 전략을 설명하시오."
          }
          className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        <div className="mb-3 mt-2 flex flex-wrap gap-2">
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

        <label className="mb-1 mt-2 block text-xs font-medium text-slate-500">
          내 답안 (마크다운·표 그대로 붙여넣어도 됩니다)
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={10}
          placeholder="여기에 직접 작성한 답안을 붙여넣으세요."
          className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            📚 정답 근거(교재·서브노트) 붙여넣기 — 정확도 판단 기준
          </summary>
          <textarea
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            rows={6}
            placeholder="이 문제의 정답 근거가 되는 교재 내용을 붙여넣으세요. 이 기준으로 사실 오류·누락을 짚어줍니다."
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </details>

        <div className="mt-5">
          <Button onClick={grade} disabled={loading}>
            {loading ? "채점 중…" : "채점받기"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {loading && <Spinner label="채점위원이 답안을 평가하고 있습니다…" />}
        {error && <ErrorBox message={error} />}
        {feedback && (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <Markdown>{feedback}</Markdown>
          </article>
        )}
      </div>
    </div>
  );
}
