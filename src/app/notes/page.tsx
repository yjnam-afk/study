"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";
import {
  WrongNote,
  loadNotes,
  removeNote,
  clearNotes,
  reviewNote,
  dueNotes,
} from "@/lib/notes";

export default function NotesPage() {
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [ready, setReady] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    setNotes(loadNotes());
    setReady(true);
  }, []);

  const due = dueNotes(notes);
  const masteredCount = notes.filter((n) => n.mastered).length;

  return (
    <div>
      <PageHeader
        title="📕 오답노트 — 반복 암기"
        desc="자주 틀린 문제일수록 더 자주 다시 출제됩니다. 여러 번 맞혀야 '암기 완료'가 됩니다. (이 브라우저에 저장)"
      />

      {reviewing ? (
        <ReviewSession
          initialQueue={due}
          onUpdate={setNotes}
          onExit={() => {
            setNotes(loadNotes());
            setReviewing(false);
          }}
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-3 gap-4">
            <Stat label="총 오답" value={`${notes.length}개`} />
            <Stat label="오늘 복습" value={`${due.length}개`} accent />
            <Stat label="암기 완료" value={`${masteredCount}개`} />
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-amber-800">
              {due.length > 0
                ? `🔁 복습할 오답이 ${due.length}개 있습니다. 자주 틀린 것부터 다시 풀어요.`
                : "✅ 오늘 복습할 오답이 없습니다. 잘하고 있어요!"}
            </p>
            <Button onClick={() => setReviewing(true)} disabled={due.length === 0}>
              오답 복습 시작
            </Button>
          </div>

          {ready && notes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">
                아직 오답이 없습니다. 먼저{" "}
                <Link
                  href="/memorize"
                  className="font-medium text-brand-600 hover:underline"
                >
                  암기 퀴즈
                </Link>
                를 풀어 보세요. 틀린 문제가 여기에 모입니다.
              </p>
            </div>
          )}

          {notes.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => {
                  if (confirm("오답노트를 모두 비울까요?")) setNotes(clearNotes());
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:text-red-500"
              >
                전체 비우기
              </button>
            </div>
          )}

          <div className="space-y-4">
            {notes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onRemove={() => setNotes(removeNote(n.id))}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewSession({
  initialQueue,
  onUpdate,
  onExit,
}: {
  initialQueue: WrongNote[];
  onUpdate: (notes: WrongNote[]) => void;
  onExit: () => void;
}) {
  const [queue] = useState<WrongNote[]>(initialQueue);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const note = queue[idx];
  const done = idx >= queue.length;

  function choose(oi: number) {
    if (picked !== null) return;
    setPicked(oi);
    const correct = oi === note.answer;
    if (correct) setCorrectCount((c) => c + 1);
    onUpdate(reviewNote(note.id, correct));
  }

  function next() {
    setPicked(null);
    setIdx((i) => i + 1);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-3xl">🎉</div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">복습 완료!</h2>
        <p className="mt-1 text-sm text-slate-600">
          {queue.length}문제 중{" "}
          <span className="font-semibold text-amber-600">{correctCount}</span>
          문제 정답. 틀린 문제는 곧 다시 출제됩니다.
        </p>
        <div className="mt-5">
          <Button onClick={onExit}>오답노트로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const answered = picked !== null;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {idx + 1} / {queue.length}
        </span>
        <button onClick={onExit} className="hover:text-slate-700">
          종료
        </button>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${(idx / queue.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium text-brand-500">{note.topic}</span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
            {note.wrongCount}번 틀림
          </span>
        </div>
        <p className="font-semibold text-slate-900">{note.question}</p>
        <div className="mt-3 space-y-2">
          {note.options.map((opt, oi) => {
            const isAnswer = oi === note.answer;
            const isPicked = picked === oi;
            let cls =
              "w-full rounded-lg border px-3 py-2 text-left text-sm transition ";
            if (!answered)
              cls += "border-slate-200 hover:border-brand-300 hover:bg-brand-50";
            else if (isAnswer)
              cls += "border-amber-400 bg-amber-50 text-amber-800";
            else if (isPicked) cls += "border-red-300 bg-red-50 text-red-700";
            else cls += "border-slate-200 text-slate-500";
            return (
              <button
                key={oi}
                disabled={answered}
                onClick={() => choose(oi)}
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
                picked === note.answer
                  ? "font-semibold text-amber-600"
                  : "font-semibold text-red-600"
              }
            >
              {picked === note.answer ? "정답! 다음엔 간격이 늘어납니다. " : "오답. 곧 다시 출제됩니다. "}
            </span>
            {note.explanation}
          </div>
        )}
        {answered && (
          <div className="mt-4">
            <Button onClick={next}>
              {idx + 1 >= queue.length ? "결과 보기" : "다음 문제"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, onRemove }: { note: WrongNote; onRemove: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-brand-500">{note.topic}</span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
            {note.wrongCount}번 틀림
          </span>
          {note.mastered ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              암기 완료
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {note.box}/5 단계
            </span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-xs text-slate-400 hover:text-red-500"
          title="이 문제 삭제"
        >
          삭제
        </button>
      </div>
      <p className="font-semibold text-slate-900">{note.question}</p>
      <button
        onClick={() => setShow((s) => !s)}
        className="mt-3 text-sm font-medium text-brand-600 hover:underline"
      >
        {show ? "정답·해설 접기" : "정답·해설 보기"}
      </button>
      {show && (
        <div className="mt-2 space-y-2">
          {note.options.map((opt, oi) => {
            const isAnswer = oi === note.answer;
            let cls = "rounded-lg border px-3 py-2 text-sm ";
            if (isAnswer) cls += "border-amber-400 bg-amber-50 text-amber-800";
            else cls += "border-slate-200 text-slate-600";
            return (
              <div key={oi} className={cls}>
                {String.fromCharCode(9312 + oi)} {opt}
                {isAnswer && <span className="ml-2 text-xs font-semibold">← 정답</span>}
              </div>
            );
          })}
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {note.explanation}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div
        className={`text-2xl font-bold ${accent ? "text-brand-600" : "text-slate-900"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
