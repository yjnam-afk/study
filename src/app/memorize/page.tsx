"use client";

import { useState } from "react";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import { addNote, recordQuiz } from "@/lib/notes";
import topics from "@/data/topics.json";

type Mode = "flashcard" | "quiz";
type Flashcard = { front: string; back: string };
type QuizItem = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

const CATS = Array.from(new Set(topics.map((t) => t.category)));
const IMP_ORDER: Record<string, number> = { 상: 0, 중: 1, 하: 2, 출제예상: 3 };

export default function MemorizePage() {
  const [mode, setMode] = useState<Mode>("flashcard");
  const [topic, setTopic] = useState("");
  const [recCat, setRecCat] = useState(CATS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [quizTopic, setQuizTopic] = useState("");

  async function generate() {
    if (!topic.trim()) {
      setError("토픽을 입력하거나 추천 토픽을 선택하세요.");
      return;
    }
    setLoading(true);
    setError("");
    setCards([]);
    setQuiz([]);
    try {
      const endpoint = mode === "flashcard" ? "/api/flashcards" : "/api/quiz";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count: mode === "flashcard" ? 8 : 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      if (mode === "flashcard") setCards(data.cards || []);
      else {
        setQuiz(data.quiz || []);
        setQuizTopic(topic);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="🧠 암기 — 플래시카드 · 퀴즈"
        desc="토픽으로 플래시카드와 4지선다 퀴즈를 만들어 반복 암기합니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex rounded-lg border border-slate-200 p-1">
          {(
            [
              ["flashcard", "플래시카드"],
              ["quiz", "퀴즈"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                mode === m
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예) 데이터베이스 정규화"
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
            {loading
              ? "생성 중…"
              : mode === "flashcard"
                ? "플래시카드 만들기"
                : "퀴즈 만들기"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {loading && <Spinner />}
        {error && <ErrorBox message={error} />}
        {cards.length > 0 && <FlashcardDeck cards={cards} />}
        {quiz.length > 0 && <Quiz quiz={quiz} topic={quizTopic} />}
      </div>
    </div>
  );
}

function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((c, i) => (
        <FlippableCard key={i} card={c} index={i + 1} />
      ))}
    </div>
  );
}

function FlippableCard({ card, index }: { card: Flashcard; index: number }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      className="min-h-[140px] rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
    >
      <div className="mb-2 text-xs font-medium text-brand-500">
        카드 {index} · {flipped ? "정답" : "질문 (클릭하여 뒤집기)"}
      </div>
      <div className="text-sm leading-relaxed text-slate-800">
        {flipped ? card.back : card.front}
      </div>
    </button>
  );
}

function Quiz({ quiz, topic }: { quiz: QuizItem[]; topic: string }) {
  const [picked, setPicked] = useState<Record<number, number>>({});

  function choose(qi: number, oi: number) {
    if (picked[qi] !== undefined) return; // 한 번만 채점
    setPicked((p) => ({ ...p, [qi]: oi }));
    const q = quiz[qi];
    const correct = oi === q.answer;
    recordQuiz(correct);
    if (!correct) {
      addNote({
        topic: topic || "기타",
        question: q.question,
        options: q.options,
        answer: q.answer,
        picked: oi,
        explanation: q.explanation,
      });
    }
  }

  return (
    <div className="space-y-5">
      {quiz.map((q, qi) => {
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
                if (!answered) {
                  cls += "border-slate-200 hover:border-brand-300 hover:bg-brand-50";
                } else if (isAnswer) {
                  cls += "border-amber-400 bg-amber-50 text-amber-800";
                } else if (isPicked) {
                  cls += "border-red-300 bg-red-50 text-red-700";
                } else {
                  cls += "border-slate-200 text-slate-500";
                }
                return (
                  <button
                    key={oi}
                    disabled={answered}
                    onClick={() => choose(qi, oi)}
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
                      ? "font-semibold text-amber-600"
                      : "font-semibold text-red-600"
                  }
                >
                  {choice === q.answer ? "정답입니다! " : "오답입니다. "}
                </span>
                {q.explanation}
                {choice !== q.answer && (
                  <span className="mt-1 block text-xs text-brand-500">
                    📕 오답노트에 저장되었습니다.
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
