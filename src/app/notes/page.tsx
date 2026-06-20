"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { WrongNote, loadNotes, removeNote, clearNotes } from "@/lib/notes";

export default function NotesPage() {
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setNotes(loadNotes());
    setReady(true);
  }, []);

  return (
    <div>
      <PageHeader
        title="📕 오답노트"
        desc="암기 퀴즈에서 틀린 문제가 자동으로 모입니다. 시험 전에 약점만 골라 복습하세요. (이 브라우저에 저장됩니다.)"
      />

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          저장된 오답 <span className="font-semibold text-slate-800">{notes.length}</span>개
        </p>
        {notes.length > 0 && (
          <button
            onClick={() => {
              if (confirm("오답노트를 모두 비울까요?")) setNotes(clearNotes());
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:text-red-500"
          >
            전체 비우기
          </button>
        )}
      </div>

      {ready && notes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            아직 오답이 없습니다. 먼저{" "}
            <Link href="/memorize" className="font-medium text-brand-600 hover:underline">
              암기 퀴즈
            </Link>
            를 풀어 보세요. 틀린 문제가 여기에 모입니다.
          </p>
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
    </div>
  );
}

function NoteCard({ note, onRemove }: { note: WrongNote; onRemove: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-brand-500">{note.topic}</span>
        <button
          onClick={onRemove}
          className="text-xs text-slate-400 hover:text-red-500"
          title="이 문제 삭제(암기 완료)"
        >
          ✓ 익혔어요
        </button>
      </div>
      <p className="font-semibold text-slate-900">{note.question}</p>
      <div className="mt-3 space-y-2">
        {note.options.map((opt, oi) => {
          const isAnswer = oi === note.answer;
          const isPicked = oi === note.picked;
          let cls = "rounded-lg border px-3 py-2 text-sm ";
          if (show && isAnswer) cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
          else if (isPicked) cls += "border-red-300 bg-red-50 text-red-700";
          else cls += "border-slate-200 text-slate-600";
          return (
            <div key={oi} className={cls}>
              {String.fromCharCode(9312 + oi)} {opt}
              {isPicked && <span className="ml-2 text-xs">← 내가 고른 답</span>}
              {show && isAnswer && <span className="ml-2 text-xs font-semibold">← 정답</span>}
            </div>
          );
        })}
      </div>
      <button
        onClick={() => setShow((s) => !s)}
        className="mt-3 text-sm font-medium text-brand-600 hover:underline"
      >
        {show ? "해설 접기" : "정답·해설 보기"}
      </button>
      {show && (
        <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {note.explanation}
        </div>
      )}
    </div>
  );
}
