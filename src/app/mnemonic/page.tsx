"use client";

import { useEffect, useState } from "react";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import ShareButton from "@/components/ShareButton";
import TopicAutocomplete from "@/components/TopicAutocomplete";
import topics from "@/data/topics.json";

type Item = { term: string; initial: string; desc: string };
type Group = {
  items: Item[];
  mnemonic: string;
  mnemonicHow: string;
  /** 정의 — 한 문장(약 2줄). 구버전 호환 위해 배열도 허용. */
  definition?: string | string[];
  /** 정의 아래 핵심 특징 3개. */
  features?: string[];
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

type Step = "learn" | "inject" | "check" | "write";

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
  const [subnote, setSubnote] = useState<{
    mnemonic: string;
    keywords: string[];
    sections?: { label: string; mnemonic: string; keywords: string[] }[];
  } | null>(null);
  const [step, setStep] = useState<Step>("learn");
  const [autoPending, setAutoPending] = useState(false);

  // 학습 코치 등에서 ?topicId=&topic=&auto= 으로 들어오면 해당 토픽을
  // 미리 선택하고, auto=1이면 도착 즉시 자동 생성한다.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("topicId") || "";
    const title = sp.get("topic") || "";
    const auto = sp.get("auto") === "1";
    if (id) {
      const t = topics.find((x) => x.id === id);
      if (t) {
        setTopic(t.title);
        setTopicId(t.id);
        setRecCat(t.category);
        if (auto) setAutoPending(true);
        return;
      }
    }
    if (title) {
      setTopic(title);
      if (auto) setAutoPending(true);
    }
  }, []);

  // 토픽이 채워진 뒤 한 번만 자동 생성.
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
    setSet(null);
    setSubnote(null);
    try {
      const res = await fetch("/api/mnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, topicId, reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      setSet(data.set);
      setSubnote(
        data.subnote && (data.subnote.mnemonic || data.subnote.keywords?.length)
          ? data.subnote
          : null,
      );
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
        <TopicAutocomplete
          value={topic}
          onChange={(v) => {
            setTopic(v);
            setTopicId(""); // 직접 입력 시 데이터 연결 해제
          }}
          onSelect={(t) => {
            setTopic(t.title);
            setTopicId(t.id); // 제안 선택 → 교재 근거 연결
          }}
          placeholder="토픽/키워드 입력 (예: 트랜잭션, ACID) — 비슷한 토픽이 떠요"
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
            <div className="mb-3 flex justify-end">
              <ShareButton
                title={`[스파르타 소설클럽] ${set.topic} 두음신공`}
                text={`🥷 ${set.topic} 두음신공\n\n서론: ${set.intro.mnemonic}\n본론: ${set.body.mnemonic}\n\n핵심 키워드: ${set.body.items.map((i) => i.term).join(", ")}`}
              />
            </div>
            <Stepper step={step} onStep={setStep} />
            {step === "learn" && (
              <Learn
                set={set}
                fromSubnote={Boolean(
                  subnote && (subnote.mnemonic || subnote.keywords.length > 0),
                )}
                sections={subnote?.sections || []}
                onNext={() => setStep("inject")}
              />
            )}
            {step === "inject" && (
              <Inject mc={set.mc} onNext={() => setStep("check")} />
            )}
            {step === "check" && (
              <Check recall={set.recall} onNext={() => setStep("write")} />
            )}
            {step === "write" && <Write group={set.body} />}
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
    ["check", "3. 키워드 확인"],
    ["write", "4. 설명 쓰기(찐소설)"],
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

function GroupCard({
  label,
  sub,
  group,
  hideDesc,
  originBadge,
}: {
  label: string;
  sub: string;
  group: Group;
  hideDesc?: boolean;
  originBadge?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-indigo-50 p-5 text-center shadow-sm">
        {originBadge && (
          <span className="mb-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300">
            📒 교재 원본 반영
          </span>
        )}
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
              {!hideDesc && <th className="px-4 py-3 text-left">설명</th>}
            </tr>
          </thead>
          <tbody>
            {group.items.map((it, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-3 text-center text-lg font-bold text-brand-600">
                  {it.initial}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{it.term}</td>
                {!hideDesc && (
                  <td className="px-4 py-3 text-slate-600">{it.desc}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(() => {
        const defText = Array.isArray(group.definition)
          ? group.definition.filter(Boolean).join(" ")
          : (group.definition || "").trim();
        const feats = (group.features || []).filter(Boolean);
        if (!defText && feats.length === 0) return null;
        return (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 text-xs font-semibold text-emerald-700">
              ✍️ 답안지 서론(정의) — 키워드 나열식 한 문장(약 2줄)
            </div>
            {defText && (
              <p className="font-medium leading-relaxed text-slate-800">
                {defText}
              </p>
            )}
            {feats.length > 0 && (
              <div className="mt-3 border-t border-emerald-200 pt-3">
                <div className="mb-1 text-xs font-semibold text-emerald-700">
                  ⭐ 특징
                </div>
                <ul className="space-y-0.5 text-sm text-slate-700">
                  {feats.map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function Learn({
  set,
  fromSubnote,
  sections,
  onNext,
}: {
  set: MnemonicSet;
  fromSubnote?: boolean;
  sections?: { label: string; mnemonic: string; keywords: string[] }[];
  onNext: () => void;
}) {
  const hasSections = (sections || []).length > 0;
  return (
    <div className="space-y-6">
      <GroupCard
        label="📌 서론(정의) 두음"
        sub="답안 I. 개요에 쓸 키워드"
        group={set.intro}
        hideDesc
      />
      {hasSections ? (
        // 교재에 섹션별 두음(특징·기술요소·분류 등)이 있으면 각각 별도 카드로.
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300">
              📒 교재 원본 두음
            </span>
            <span className="text-xs text-slate-500">
              본론(2단락+) — 섹션마다 두음이 따로예요
            </span>
          </div>
          {sections!.map((s, i) => (
            <SectionCard key={i} section={s} />
          ))}
        </div>
      ) : (
        <GroupCard
          label="📝 본론(2단락+) 두음"
          sub="답안 II. 본론 구성요소·설명(3열)"
          group={set.body}
          originBadge={fromSubnote}
        />
      )}
      <Button onClick={onNext}>외웠어요 → 객관식으로 주입</Button>
    </div>
  );
}

/** 교재 원본의 한 섹션(특징/기술요소/분류 등) 두음 카드 — 두음 ↔ 키워드 매핑. */
function SectionCard({
  section,
}: {
  section: { label: string; mnemonic: string; keywords: string[] };
}) {
  // 두음이 키워드 수와 맞으면 글자별로 매핑, 아니면 두음 문자열만 표시.
  const letters = [...(section.mnemonic || "").replace(/\s/g, "")];
  const aligned = letters.length === section.keywords.length;
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-emerald-50 px-4 py-2">
        <span className="text-xs font-bold text-emerald-800">
          📝 {section.label}
        </span>
        <span className="text-lg font-extrabold tracking-wide text-emerald-700">
          {section.mnemonic}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {section.keywords.map((k, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-100 text-xs font-extrabold text-emerald-700">
              {aligned ? letters[i] : i + 1}
            </span>
            <span className="text-slate-800">{k}</span>
          </li>
        ))}
      </ul>
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

function Check({
  recall,
  onNext,
}: {
  recall: { prompt: string; answers: string[] };
  onNext: () => void;
}) {
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

      <Button onClick={onNext}>
        키워드는 됐다 → ✍️ 설명(찐소설) 쓰러 가기
      </Button>
    </div>
  );
}

/**
 * 찐소설 = 답안 표의 "설명(3열)" 쓰기 연습.
 * 외운 키워드별로 설명을 직접 써보고, 모범 설명(서브노트/모델)과 비교한다.
 * 키워드만 외우는 데서 끝나지 않고 "설명을 쓰는 힘"을 기르는 핵심 단계.
 */
function Write({ group }: { group: Group }) {
  const items = group.items || [];
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-800">
          ✍️ 찐소설은 &ldquo;설명(3열)&rdquo;입니다
        </p>
        <p className="mt-1 text-xs text-amber-700">
          키워드(2열)는 뼈대일 뿐, 점수는 각 키워드를 풀어 쓴 <b>설명</b>에서
          갈립니다. 만능 공식:{" "}
          <b>[구성요소]가 [무엇을·어떻게]하여 [효과]를 달성</b>. 직접 써보고
          모범 설명과 비교하세요.
        </p>
      </div>

      {items.map((it, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {it.initial}
            </span>
            <span className="font-semibold text-slate-900">{it.term}</span>
          </div>
          <textarea
            value={drafts[i] || ""}
            onChange={(e) =>
              setDrafts((d) => ({ ...d, [i]: e.target.value }))
            }
            rows={2}
            placeholder={`${it.term}의 '설명'을 한 문장으로 써보세요`}
            className="mt-3 w-full resize-none rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
            className="mt-2 text-xs font-medium text-brand-600 hover:underline"
          >
            {revealed[i] ? "모범 설명 숨기기" : "모범 설명 보기 →"}
          </button>
          {revealed[i] && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-slate-700">
              <span className="text-xs font-semibold text-emerald-700">
                모범 설명{" "}
              </span>
              {it.desc}
            </div>
          )}
        </div>
      ))}

      <p className="text-center text-xs text-slate-400">
        이 표(키워드 + 설명)가 그대로 답안지 본론의 3열 표가 됩니다.
      </p>
    </div>
  );
}
