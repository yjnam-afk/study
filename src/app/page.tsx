"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import topics from "@/data/topics.json";
import { ReviewItem, loadReview, getItem, isDue } from "@/lib/storage";
import { QuizStats, loadStats, loadNotes, dueNotes } from "@/lib/notes";

const menus = [
  {
    href: "/answer",
    emoji: "📝",
    title: "답안지 생성",
    desc: "1교시(용어형)·2교시(서술형) 문제에 대한 시험 답안지를 AI가 작성해 줍니다.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    href: "/grade",
    emoji: "✅",
    title: "AI 자가채점",
    desc: "내가 쓴 답안을 채점위원 관점에서 점수와 보완점으로 피드백합니다.",
    color: "from-rose-500 to-red-600",
  },
  {
    href: "/explain",
    emoji: "💡",
    title: "토픽 설명",
    desc: "어려운 토픽을 비유와 도식으로 이해하기 쉽게 풀어 설명합니다.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    href: "/mnemonic",
    emoji: "🥷",
    title: "두음신공 (키워드 암기)",
    desc: "핵심 키워드의 두음으로 암기하고, 객관식 주입 → 주관식 확인으로 굳힙니다.",
    color: "from-violet-500 to-purple-600",
  },
  {
    href: "/memorize",
    emoji: "🧠",
    title: "암기 (플래시카드·퀴즈)",
    desc: "토픽으로 플래시카드와 4지선다 퀴즈를 만들어 암기를 돕습니다.",
    color: "from-amber-500 to-orange-600",
  },
  {
    href: "/notes",
    emoji: "📕",
    title: "오답노트",
    desc: "암기 퀴즈에서 틀린 문제가 자동으로 모입니다. 약점만 골라 복습하세요.",
    color: "from-cyan-500 to-sky-600",
  },
  {
    href: "/review",
    emoji: "🔁",
    title: "회독 관리",
    desc: "토픽별 회독 횟수와 진도를 기록하고 반복 학습을 관리합니다.",
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    href: "/leaderboard",
    emoji: "🏆",
    title: "학습 랭킹",
    desc: "로그인하고 회독·퀴즈 기록으로 다른 사람들과 경쟁하세요.",
    color: "from-yellow-500 to-amber-600",
  },
];

export default function Home() {
  const [review, setReview] = useState<Record<string, ReviewItem>>({});
  const [stats, setStats] = useState<QuizStats>({
    total: 0,
    correct: 0,
    lastAt: null,
  });
  const [notesCount, setNotesCount] = useState(0);
  const [dueNoteCount, setDueNoteCount] = useState(0);

  useEffect(() => {
    setReview(loadReview());
    setStats(loadStats());
    const notes = loadNotes();
    setNotesCount(notes.length);
    setDueNoteCount(dueNotes(notes).length);
  }, []);

  const total = topics.length;
  const doneCount = topics.filter(
    (t) => getItem(review, t.id).status === "done",
  ).length;
  const learningCount = topics.filter(
    (t) => getItem(review, t.id).status === "learning",
  ).length;
  const totalRounds = topics.reduce(
    (sum, t) => sum + getItem(review, t.id).rounds,
    0,
  );
  const progress = total ? Math.round((doneCount / total) * 100) : 0;
  const accuracy =
    stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const dueCount = topics.filter((t) => isDue(getItem(review, t.id))).length;

  const categories = Array.from(new Set(topics.map((t) => t.category)));
  const byCategory = categories.map((cat) => {
    const items = topics.filter((t) => t.category === cat);
    const done = items.filter(
      (t) => getItem(review, t.id).status === "done",
    ).length;
    return { cat, done, total: items.length };
  });

  return (
    <div>
      <section className="mb-8 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">📊 학습 대시보드</h1>
        <p className="mt-2 max-w-2xl text-brand-50">
          정보관리기술사 합격까지의 진도를 한눈에. 아래 현황을 확인하고 이어서
          학습하세요.
        </p>
      </section>

      {dueCount > 0 && (
        <Link
          href="/review"
          className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition hover:bg-amber-100"
        >
          <span className="text-sm font-medium text-amber-800">
            🔔 오늘 복습할 토픽이 <b>{dueCount}개</b> 있습니다.
          </span>
          <span className="text-sm font-semibold text-amber-700">복습하러 가기 →</span>
        </Link>
      )}

      {dueNoteCount > 0 && (
        <Link
          href="/notes"
          className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm transition hover:bg-rose-100"
        >
          <span className="text-sm font-medium text-rose-800">
            🔁 다시 풀어야 할 오답이 <b>{dueNoteCount}개</b> 있습니다.
          </span>
          <span className="text-sm font-semibold text-rose-700">오답 복습 →</span>
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="완료 진도" value={`${progress}%`} accent />
        <Stat label="퀴즈 정답률" value={stats.total > 0 ? `${accuracy}%` : "—"} />
        <Stat label="총 회독 수" value={`${totalRounds}회`} />
        <Stat label="오늘 복습" value={`${dueCount}개`} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-slate-700">
              토픽 완료 ({doneCount}/{total})
            </span>
            <span className="text-slate-500">{progress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            학습 중 {learningCount}개 · 시작 전{" "}
            {total - doneCount - learningCount}개
          </p>

          <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {stats.total > 0 ? (
              <>
                퀴즈 <span className="font-semibold">{stats.total}</span>문제 중{" "}
                <span className="font-semibold text-emerald-600">
                  {stats.correct}
                </span>
                문제 정답 (정답률 {accuracy}%).
                {notesCount > 0 && (
                  <>
                    {" "}
                    <Link
                      href="/notes"
                      className="font-medium text-brand-600 hover:underline"
                    >
                      오답노트
                    </Link>
                    에서 복습하세요.
                  </>
                )}
              </>
            ) : (
              <>
                아직 푼 퀴즈가 없습니다.{" "}
                <Link
                  href="/memorize"
                  className="font-medium text-brand-600 hover:underline"
                >
                  암기 퀴즈
                </Link>
                를 풀면 정답률이 기록됩니다.
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            분야별 완료 현황
          </h3>
          <div className="space-y-3">
            {byCategory.map((c) => {
              const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
              return (
                <div key={c.cat}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-600">{c.cat}</span>
                    <span className="text-slate-400">
                      {c.done}/{c.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-bold text-slate-900">바로가기</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {menus.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div
              className={`mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${m.color} text-2xl`}
            >
              {m.emoji}
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-brand-600">
              {m.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {m.desc}
            </p>
          </Link>
        ))}
      </div>
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
