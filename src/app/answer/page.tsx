"use client";

import { readJsonSafe } from "@/lib/safeJson";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import Markdown from "@/components/Markdown";
import ShareButton from "@/components/ShareButton";
import questions from "@/data/questions.json";
import topics from "@/data/topics.json";
import { getModelAnswerByQuestion } from "@/lib/modelAnswers";

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
  const modelAnswer = getModelAnswerByQuestion(question);

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
      const { ok, data } = await readJsonSafe(res);
      if (!ok) throw new Error((data.error as string) || "힌트 생성 실패");
      setHint(data.hint as Hint);
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
      const { ok, data } = await readJsonSafe(res);
      if (!ok) throw new Error((data.error as string) || "가이드 생성 실패");
      setStory(data.guide as string);
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
      const { ok, data } = await readJsonSafe(res);
      if (!ok) throw new Error((data.error as string) || "생성 실패");
      setAnswer(data.answer as string);
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

      <MethodGuide period={period} />

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
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600">
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

      {modelAnswer && (
        <div className="mt-6">
          <details open className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-bold text-amber-800">
              📘 이 문제의 클로드 모범답안 (무료·즉시)
            </summary>
            <div className="mt-2 rounded-md bg-white px-2.5 py-1 text-[11px] text-amber-700 ring-1 ring-amber-200">
              🧾 근거: {modelAnswer.source}
            </div>
            <article className="mt-3 rounded-xl bg-white p-5 md:p-6">
              <Markdown>{modelAnswer.answer}</Markdown>
            </article>
            <p className="mt-2 text-xs text-amber-600">
              ↑ 미리 작성된 모범답안입니다. 아래 &ldquo;답안 생성&rdquo;은 실시간(무료 LLM)
              결과로, 비교용이에요.
            </p>
          </details>
        </div>
      )}

      {(hintLoading || hint) && (
        <div className="mt-6">
          {hintLoading && <Spinner label="키워드·두음을 뽑는 중…" />}
          {hint && (
            <div className="rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-brand-700">🔑 답안 힌트</h3>
              <div className="mt-3 rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 p-4 text-center">
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                ⚡ 실시간 생성(무료 LLM){topicId ? " · 서브노트 근거" : " · 일반지식"}
              </span>
              <ShareButton
                title={`[말랑말랑 스파르타] ${question.slice(0, 40)}`}
                text={`📝 ${question}\n\n${answer}`}
              />
            </div>
            <Markdown>{answer}</Markdown>
          </article>
        )}
      </div>
    </div>
  );
}

/** 답안 작성 방법론(ITPE 강정배 작성론 원문 기준) 치트시트 — 교시별 구조와 핵심 원칙. */
function MethodGuide({ period }: { period: Period }) {
  const struct1: [string, string][] = [
    [
      "I. 서론 (I 단독 또는 가·나)",
      "정의 2줄(키워드 나열·밑줄·\"\", 문장 금지) + 특징/등장배경. '개요·개념'이라 쓰지 말 것. 리드문 18자. 서론 4타입: ①정의만 ②정의+특징 ③정의+특징(표) ④정의+특징(그림)",
    ],
    [
      "II. 본론 — 일도일표",
      "가. 개념도(구성도·아키텍처, 5~7줄/평균 6줄) + 나. 3단표(2:2:6 비율, 구성요소·기술요소·절차). 개념도 노드 = 표 행 1:1",
    ],
    [
      "III. 결론 (7점 단락)",
      "수직 확장(T자)·수평 연계(I자) 또는 비교표로 차별화(3~4줄), 활용 사례/분야",
    ],
  ];
  const struct2: [string, string][] = [
    [
      "I. 서론 (0.5P) — 도입부 6타입",
      "①1교시 상속·확장(정의2줄→5~6줄+특징표) ②정의+특징(그림/도식) ③Why 관점(중요성·필요성, 억지정의 금지·보안) ④로드맵(가·나·다를 한 그림, Top-down 6~7줄) ⑤병렬식(답 있는 다항문제) ⑥발전단계(순서·절차)",
    ],
    ["II. 본론1 (1P)", "질문 요구사항, 없으면 구성도+구성요소/기술요소(1교시와 동일)"],
    [
      "III. 본론2 (1P · 승부처)",
      "물어본 것이 안 물어본 것보다 많아야 함. 동작원리·단계·비교표 (15점)",
    ],
    ["IV. 결론 (+α, 0.3~0.5P)", "차별화 알파 — 특강·신문·타토픽 응용·경험 사례 (17점)"],
  ];
  const rows = period === "1교시" ? struct1 : struct2;

  return (
    <details className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <summary className="cursor-pointer text-sm font-bold text-brand-800">
        📐 답안 작성 방법론 ({period} · ITPE 강정배 작성론 원문 기준) — 펼쳐보기
      </summary>
      <div className="mt-3 space-y-2">
        {rows.map(([h, b]) => (
          <div key={h} className="rounded-lg bg-white p-3">
            <div className="text-sm font-semibold text-brand-700">{h}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-slate-600">
              {b}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg bg-white p-3">
        <div className="mb-1 text-xs font-bold text-slate-700">
          📏 분량·시간
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          {period === "1교시"
            ? "13개 중 10개 선택 · 1문제 10분(100분) · 기본 1.2P, 최대 1.4P · 2단락/1P 전략은 6점에 그침"
            : "4문제 25분씩 · 문제당 3~3.5P(총 12~14P) · 단락별 1줄 띄움(2교시만), 문제당 2줄 띄움"}
        </p>
      </div>

      <div className="mt-3 rounded-lg bg-white p-3">
        <div className="mb-1 text-xs font-bold text-slate-700">
          ✅ 공통 원칙 (1·2교시 동일)
        </div>
        <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-slate-600">
          <li>리드문: &ldquo;문 N) 토픽 Full Name&rdquo; (2교시는 물어본 것 요약, 누락 금지)</li>
          <li>
            정의 = 키워드 나열(밑줄·&ldquo;&rdquo; 강조), <b>문장·주저리 금지</b>, 명사형. 시험 전 키워드 3개 미리 도출
          </li>
          <li>목차 = 지문 그대로(물어본 text 그대로, 순서 주의), 키워드 <b>굵게</b>·3회 노출</li>
          <li>일도일표 = 개념도(6줄) + 3단표(2:2:6), 노드=행 1:1, 표는 점 대신 &ldquo;–&rdquo;로 줄 구분</li>
          <li>
            <b>찐소설은 표의 3열(설명)</b> — 키워드는 1·2열, 설명에서 점수가 갈림
          </li>
          {period === "1교시" && (
            <li className="font-medium text-rose-600">
              1교시는 <b>사실 중심</b> — 추상적 기대효과·고려사항·답 없는 간글 지양
            </li>
          )}
          <li>물어본 것으로만 작성 — &lsquo;상위&rsquo;·&lsquo;옆&rsquo;으로 가지 말 것(방어 제외)</li>
        </ul>
      </div>
    </details>
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
