"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  // 기출문제 메뉴 등에서 ?period=&question= 으로 들어오면 문제를 미리 채운다.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get("period");
    if (p === "1교시" || p === "2교시") setPeriod(p);
    const q = sp.get("question");
    if (q) setQuestion(q);
  }, []);

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
        body: JSON.stringify({ period, question, reference, topicId, topicTitle }),
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

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* STEP 1 — 교시 */}
        <section>
          <StepLabel n={1} title="교시 선택" />
          <div className="grid grid-cols-2 gap-2">
            {(["1교시", "2교시"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  period === p
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`text-sm font-bold ${period === p ? "text-brand-700" : "text-slate-700"}`}
                >
                  {p}
                </div>
                <div className="text-xs text-slate-400">
                  {p === "1교시" ? "용어형 · 1쪽 분량" : "서술형 · 2~3쪽 분량"}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* STEP 2 — 문제 */}
        <section>
          <StepLabel n={2} title="문제 입력" />
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
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400">예시·기출:</span>
            {samples.slice(0, 6).map((q) => {
              const src = (q as { source?: string }).source;
              return (
                <button
                  key={q.id}
                  onClick={() => setQuestion(q.text)}
                  title={q.text}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    src
                      ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-300 hover:text-brand-600"
                  }`}
                >
                  {src && <span className="font-semibold">기출 </span>}
                  {q.text.length > 18 ? q.text.slice(0, 18) + "…" : q.text}
                </button>
              );
            })}
            <Link
              href="/exam"
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-brand-600 hover:bg-slate-50"
            >
              기출 더보기 →
            </Link>
          </div>
        </section>

        {/* STEP 3 — 토픽 연결 */}
        <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <StepLabel
            n={3}
            title="토픽 연결"
            badge="선택"
            desc="연결하면 내 서브노트 내용을 근거로 더 정확하게 작성합니다."
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={recCat}
              onChange={(e) => setRecCat(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-40"
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
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">
                연결 안 함 ({topics.filter((t) => t.category === recCat).length}개)
              </option>
              {topics
                .filter((t) => t.category === recCat)
                .slice()
                .sort(
                  (a, b) =>
                    (IMP_ORDER[a.importance] ?? 9) -
                    (IMP_ORDER[b.importance] ?? 9),
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.importance}] {t.title}
                  </option>
                ))}
            </select>
          </div>
          {topicId && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
              ✓ &ldquo;{topicTitle}&rdquo; 서브노트를 근거로 작성합니다.
            </p>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
              📚 교재·참고자료 직접 붙여넣기
            </summary>
            <textarea
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              rows={5}
              placeholder="이 문제와 관련된 교재/서브노트 내용을 붙여넣으세요. (관련 부분만)"
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              붙여넣은 내용을 최우선 근거로 사용합니다.
            </p>
          </details>
        </section>

        {/* ACTION */}
        <section className="border-t border-slate-100 pt-5">
          <Button
            onClick={generate}
            disabled={loading}
            className="w-full justify-center py-3 text-base"
          >
            {loading ? "작성 중…" : "✍️ 답안 생성하기"}
          </Button>

          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs text-slate-500">
              먼저 <b>스스로 써보고</b> 비교하고 싶다면 — 보조 자료
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={getHint}
                disabled={hintLoading}
                className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
              >
                {hintLoading ? "생성 중…" : "🔑 키워드·두음 힌트"}
              </button>
              <button
                onClick={getStory}
                disabled={storyLoading}
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
              >
                {storyLoading ? "생성 중…" : "📖 소설 쓰는 법"}
              </button>
            </div>
          </div>
        </section>
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

function StepLabel({
  n,
  title,
  badge,
  desc,
}: {
  n: number;
  title: string;
  badge?: string;
  desc?: string;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
          {n}
        </span>
        <span className="text-sm font-bold text-slate-800">{title}</span>
        {badge && (
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            {badge}
          </span>
        )}
      </div>
      {desc && <p className="mt-1 pl-7 text-xs text-slate-400">{desc}</p>}
    </div>
  );
}
