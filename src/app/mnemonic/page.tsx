"use client";

import { useEffect, useState } from "react";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import topics from "@/data/topics.json";

type Item = { term: string; initial: string; desc: string };
type Group = {
  items: Item[];
  mnemonic: string;
  mnemonicHow: string;
  definition?: string[];
  table?: { col1: string; col2: string; col3: string }[];
};
type MC = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};
type MnemonicSet = {
  topic: string;
  intro: Group;
  body: Group;
  mc: MC[];
  recall: { prompt: string; answers: string[] };
};

type Step = "learn" | "inject" | "check";

const CATS = Array.from(new Set(topics.map((t) => t.category)));
const IMP_ORDER: Record<string, number> = { 상: 0, 중: 1, 하: 2, 출제예상: 3 };

export default function MnemonicPage() {
  const [topic, setTopic] = useState("");
  const [topicId, setTopicId] = useState("");
  const [recCat, setRecCat] = useState(CATS[0]);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [set, setSet] = useState<MnemonicSet | null>(null);
  const [step, setStep] = useState<Step>("learn");

  // 학습 코치 등에서 ?topicId=&topic= 으로 들어오면 해당 토픽을 미리 선택한다.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("topicId") || "";
    const title = sp.get("topic") || "";
    if (id) {
      const t = topics.find((x) => x.id === id);
      if (t) {
        setTopic(t.title);
        setTopicId(t.id);
        setRecCat(t.category);
        return;
      }
    }
    if (title) setTopic(title);
  }, []);

  async function generate() {
    if (!topic.trim()) {
      setError("토픽을 입력하거나 추천 토픽을 선택하세요.");
      return;
    }
    setLoading(true);
    setError("");
    setSet(null);
    try {
      const res = await fetch("/api/mnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, topicId, reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      setSet(data.set);
      setStep("learn");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="🥷 두음신공 — 키워드 암기"
        desc="서론(정의)용·본론(2단락+)용 키워드 두음을 각각 만들어 암기 → 객관식 주입 → 주관식 확인."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <input
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            setTopicId(""); // 직접 입력 시 데이터 연결 해제
          }}
          placeholder="예) 트랜잭션 ACID 특성"
          className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
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
            onChange={(e) => {
              const t = topics.find((x) => x.id === e.target.value);
              if (t) {
                setTopic(t.title);
                setTopicId(t.id); // 데이터 연결 → 실제 내용 근거로 생성
              }
            }}
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
                <option key={t.id} value={t.id}>
                  [{t.importance}] {t.title}
                </option>
              ))}
          </select>
        </div>

        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            📚 참고자료(교재) 붙여넣기 — 실제 항목/내용을 근거로 정확하게
          </summary>
          <textarea
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            rows={6}
            placeholder="예) OWASP Top 10 for LLM의 실제 10개 항목을 붙여넣으면 그 항목으로 두음을 만듭니다."
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            무료 모델이 최신·정확한 항목을 모를 수 있어요. 교재 내용을 넣으면 그 근거로 정확히 만듭니다.
          </p>
        </details>

        <div className="mt-5">
          <Button onClick={generate} disabled={loading}>
            {loading ? "생성 중…" : "두음신공 만들기"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {loading && <Spinner label="두음신공을 만드는 중입니다…" />}
        {error && <ErrorBox message={error} />}

        {set && (
          <div>
            <Stepper step={step} onStep={setStep} />
            {step === "learn" && <Learn set={set} onNext={() => setStep("inject")} />}
            {step === "inject" && (
              <Inject mc={set.mc} onNext={() => setStep("check")} />
            )}
            {step === "check" && <Check recall={set.recall} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ step, onStep }: { step: Step; onStep: (s: Step) => void }) {
  const steps: [Step, string][] = [
    ["learn", "1. 암기"],
    ["inject", "2. 주입(객관식)"],
    ["check", "3. 확인(주관식)"],
  ];
  return (
    <div className="mb-5 inline-flex rounded-lg border border-slate-200 p-1">
      {steps.map(([s, label]) => (
        <button
          key={s}
          onClick={() => onStep(s)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            step === s ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function GroupCard({ label, sub, group }: { label: string; sub: string; group: Group }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-indigo-50 p-5 text-center shadow-sm">
        <div className="text-xs font-medium text-brand-500">
          {label} · <span className="text-slate-400">{sub}</span>
        </div>
        <div className="mt-1 text-2xl font-extrabold tracking-wide text-brand-700">
          {group.mnemonic}
        </div>
        <p className="mt-1 text-xs text-slate-600">{group.mnemonicHow}</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">두음</th>
              <th className="px-4 py-3 text-left">키워드</th>
              <th className="px-4 py-3 text-left">설명</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((it, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-3 text-center text-lg font-bold text-brand-600">
                  {it.initial}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{it.term}</td>
                <td className="px-4 py-3 text-slate-600">{it.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {group.definition && group.definition.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-2 text-xs font-semibold text-emerald-700">
            ✍️ 답안지 서론(정의) — 2줄, 키워드 열거식
          </div>
          <div className="space-y-1 font-medium leading-relaxed text-slate-800">
            {group.definition.map((line, i) => (
              <p key={i}>- {line}</p>
            ))}
          </div>
        </div>
      )}

      {group.table && group.table.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-1">
          <div className="px-3 py-2 text-xs font-semibold text-emerald-700">
            ✍️ 답안지 본론 — 3열 표
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="border border-slate-200 px-3 py-2 text-left">구분</th>
                <th className="border border-slate-200 px-3 py-2 text-left">항목</th>
                <th className="border border-slate-200 px-3 py-2 text-left">설명</th>
              </tr>
            </thead>
            <tbody>
              {group.table.map((r, i) => (
                <tr key={i}>
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">
                    {r.col1}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">
                    {r.col2}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-600">
                    {r.col3}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Learn({ set, onNext }: { set: MnemonicSet; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <GroupCard label="📌 서론(정의) 두음" sub="I단락 정의에 쓸 키워드" group={set.intro} />
      <GroupCard label="📝 본론(2단락+) 두음" sub="구성요소·특징·절차 등" group={set.body} />
      <Button onClick={onNext}>외웠어요 → 객관식으로 주입</Button>
    </div>
  );
}

function Inject({ mc, onNext }: { mc: MC[]; onNext: () => void }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const allAnswered = mc.length > 0 && Object.keys(picked).length === mc.length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        객관식으로 키워드를 각인시키세요. 모두 풀면 주관식 확인으로 넘어갑니다.
      </p>
      {mc.map((q, qi) => {
        const choice = picked[qi];
        const answered = choice !== undefined;
        return (
          <div
            key={qi}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="font-semibold text-slate-900">
              Q{qi + 1}. {q.question}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((opt, oi) => {
                const isAnswer = oi === q.answer;
                const isPicked = choice === oi;
                let cls =
                  "w-full rounded-lg border px-3 py-2 text-left text-sm transition ";
                if (!answered)
                  cls += "border-slate-200 hover:border-brand-300 hover:bg-brand-50";
                else if (isAnswer)
                  cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
                else if (isPicked) cls += "border-red-300 bg-red-50 text-red-700";
                else cls += "border-slate-200 text-slate-500";
                return (
                  <button
                    key={oi}
                    disabled={answered}
                    onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                    className={cls}
                  >
                    {String.fromCharCode(9312 + oi)} {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span
                  className={
                    choice === q.answer
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-red-600"
                  }
                >
                  {choice === q.answer ? "정답! " : "오답. "}
                </span>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}
      <Button onClick={onNext} disabled={!allAnswered}>
        주관식으로 확인하기
      </Button>
    </div>
  );
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function Check({ recall }: { recall: { prompt: string; answers: string[] } }) {
  const [input, setInput] = useState("");
  const [graded, setGraded] = useState(false);

  const norm = normalize(input);
  const results = recall.answers.map((a) => ({
    term: a,
    hit: norm.includes(normalize(a)),
  }));
  const hits = results.filter((r) => r.hit).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="font-semibold text-slate-900">{recall.prompt}</p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder="떠오르는 핵심 키워드를 모두 적어보세요 (쉼표나 줄바꿈으로 구분)"
          className="mt-3 w-full resize-none rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <div className="mt-3 flex gap-2">
          <Button onClick={() => setGraded(true)}>채점</Button>
          {graded && (
            <button
              onClick={() => {
                setInput("");
                setGraded(false);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              다시 쓰기
            </button>
          )}
        </div>
      </div>

      {graded && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm">
            <span className="font-bold text-brand-600">
              {hits} / {recall.answers.length}
            </span>{" "}
            개의 핵심 키워드를 기억했습니다!
          </p>
          <div className="flex flex-wrap gap-2">
            {results.map((r, i) => (
              <span
                key={i}
                className={`rounded-full px-3 py-1 text-sm ${
                  r.hit
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-50 text-red-600 line-through"
                }`}
              >
                {r.hit ? "✓ " : "✗ "}
                {r.term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
