"use client";

import { useState } from "react";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import Markdown from "@/components/Markdown";
import questions from "@/data/questions.json";
import topics from "@/data/topics.json";

type Period = "1교시" | "2교시";
type Hint = {
  keywords: string[];
  mnemonic: string;
  mnemonicHow: string;
  outline: string[];
};

const CATS = Array.from(new Set(topics.map((t) => t.category)));
const IMP_ORDER: Record<string, number> = { 상: 0, 중: 1, 하: 2, 출제예상: 3 };

export default function AnswerPage() {
  const [period, setPeriod] = useState<Period>("1교시");
  const [question, setQuestion] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [recCat, setRecCat] = useState(CATS[0]);
  const [reference, setReference] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [hint, setHint] = useState<Hint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [story, setStory] = useState("");
  const [storyLoading, setStoryLoading] = useState(false);

  const samples = questions.filter((q) => q.period === period);

  async function getHint() {
    if (!question.trim()) {
      setError("문제를 입력하거나 샘플을 선택하세요.");
      return;
    }
    setHintLoading(true);
    setError("");
    setHint(null);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "힌트 생성 실패");
      setHint(data.hint);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setHintLoading(false);
    }
  }

  async function getStory() {
    if (!question.trim()) {
      setError("문제를 입력하거나 샘플을 선택하세요.");
      return;
    }
    setStoryLoading(true);
    setError("");
    setStory("");
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "가이드 생성 실패");
      setStory(data.guide);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setStoryLoading(false);
    }
  }

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
        body: JSON.stringify({ period, question, reference, topicId, topicTitle }),
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">
            토픽 연결(선택 시 서브노트 내용을 근거로 작성):
          </span>
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
            value={topicId}
            onChange={(e) => {
              const t = topics.find((x) => x.id === e.target.value);
              if (t) {
                setTopicId(t.id);
                setTopicTitle(t.title);
                if (!question.trim() && period === "1교시") {
                  setQuestion(`${t.title}에 대해 설명하시오.`);
                }
              } else {
                setTopicId("");
                setTopicTitle("");
              }
            }}
            className="min-w-[12rem] rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
          >
            <option value="">
              연결 안 함 ({topics.filter((t) => t.category === recCat).length}개)
            </option>
            {topics
              .filter((t) => t.category === recCat)
              .slice()
              .sort(
                (a, b) =>
                  (IMP_ORDER[a.importance] ?? 9) - (IMP_ORDER[b.importance] ?? 9),
              )
              .map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.importance}] {t.title}
                </option>
              ))}
          </select>
        </div>
        {topicId && (
          <p className="mt-1 text-xs text-emerald-600">
            ✓ &ldquo;{topicTitle}&rdquo; 서브노트 내용을 근거로 답안을 작성합니다.
          </p>
        )}

        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            📚 참고자료(교재·서브노트) 붙여넣기 — 있으면 이 내용을 근거로 작성
          </summary>
          <textarea
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            rows={6}
            placeholder="이 문제와 관련된 교재/서브노트 내용을 붙여넣으세요. (전체가 아니라 관련 부분만)"
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            붙여넣은 내용을 최우선 근거로 사용합니다. 자료가 없으면 비워두세요(일반 지식으로 작성).
          </p>
        </details>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={generate} disabled={loading}>
            {loading ? "작성 중…" : "✍️ 답안 생성"}
          </Button>
          <button
            onClick={getHint}
            disabled={hintLoading}
            className="rounded-lg border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
          >
            {hintLoading ? "힌트 생성 중…" : "🔑 키워드·두음 힌트"}
          </button>
          <button
            onClick={getStory}
            disabled={storyLoading}
            className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
          >
            {storyLoading ? "가이드 생성 중…" : "📖 소설 쓰는 법"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          힌트·소설법은 직접 답안을 쓰도록 돕는 보조 자료입니다. 먼저 스스로 써보고
          답안 생성으로 비교해 보세요.
        </p>
      </div>

      {(hintLoading || hint) && (
        <div className="mt-6">
          {hintLoading && <Spinner label="키워드·두음을 뽑는 중…" />}
          {hint && (
            <div className="rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-brand-700">🔑 답안 힌트</h3>
              <div className="mt-3 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 p-4 text-center">
                <div className="text-xs font-medium text-brand-500">두음신공</div>
                <div className="mt-1 text-2xl font-extrabold tracking-wide text-brand-700">
                  {hint.mnemonic}
                </div>
                <p className="mt-1 text-xs text-slate-600">{hint.mnemonicHow}</p>
              </div>
              <div className="mt-4">
                <div className="mb-1 text-xs font-medium text-slate-500">
                  핵심 키워드
                </div>
                <div className="flex flex-wrap gap-2">
                  {hint.keywords.map((k, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-700"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1 text-xs font-medium text-slate-500">
                  목차 제안
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {hint.outline.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {(storyLoading || story) && (
        <div className="mt-6">
          {storyLoading && (
            <Spinner label="답안 소설 작법 가이드를 만드는 중…" />
          )}
          {story && (
            <article className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm md:p-8">
              <h3 className="mb-2 text-sm font-bold text-amber-700">
                📖 답안 소설 쓰는 법
              </h3>
              <Markdown>{story}</Markdown>
            </article>
          )}
        </div>
      )}

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
