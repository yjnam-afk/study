"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import topics from "@/data/topics.json";
import { ReviewItem, loadReview, getItem, isDue } from "@/lib/storage";
import { QuizStats, loadStats, loadNotes, dueNotes } from "@/lib/notes";

const menuGroups = [
  {
    group: "📖 개념 이해",
    items: [
      {
        href: "/explain",
        emoji: "💡",
        title: "토픽 설명",
        desc: "어려운 개념을 비유·도식으로 쉽게 설명",
        color: "from-emerald-500 to-teal-600",
      },
    ],
  },
  {
    group: "🧠 암기",
    items: [
      {
        href: "/mnemonic",
        emoji: "🥷",
        title: "두음신공",
        desc: "두음으로 키워드 암기 → 객관식·주관식 확인",
        color: "from-violet-500 to-purple-600",
      },
      {
        href: "/memorize",
        emoji: "🧠",
        title: "암기 (카드·퀴즈)",
        desc: "플래시카드·4지선다 퀴즈로 반복 암기",
        color: "from-amber-500 to-orange-600",
      },
      {
        href: "/notes",
        emoji: "📕",
        title: "오답노트",
        desc: "자주 틀린 문제부터 반복 복습",
        color: "from-cyan-500 to-sky-600",
      },
    ],
  },
  {
    group: "✍️ 답안 연습",
    items: [
      {
        href: "/answer",
        emoji: "📝",
        title: "답안지 생성",
        desc: "ITPE 방법론대로 시험 답안지 작성",
        color: "from-blue-500 to-indigo-600",
      },
      {
        href: "/grade",
        emoji: "✅",
        title: "AI 자가채점",
        desc: "내 답안을 채점위원처럼 점수·피드백",
        color: "from-rose-500 to-red-600",
      },
    ],
  },
  {
    group: "🔁 복습 · 경쟁",
    items: [
      {
        href: "/review",
        emoji: "🔁",
        title: "회독 관리",
        desc: "망각곡선 간격으로 오늘 복습 추천",
        color: "from-fuchsia-500 to-pink-600",
      },
      {
        href: "/leaderboard",
        emoji: "🏆",
        title: "학습 랭킹",
        desc: "회독·퀴즈 기록으로 랭킹 경쟁",
        color: "from-yellow-500 to-amber-600",
      },
    ],
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

      {(dueCount > 0 || dueNoteCount > 0) && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-amber-800">📌 오늘 할 일</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {dueCount > 0 && (
              <Link
                href="/review"
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
              >
                🔁 복습할 토픽 <b>{dueCount}</b>개 →
              </Link>
            )}
            {dueNoteCount > 0 && (
              <Link
                href="/notes"
                className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
              >
                📕 다시 풀 오답 <b>{dueNoteCount}</b>개 →
              </Link>
            )}
          </div>
        </div>
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

      <h2 className="mb-1 mt-10 text-lg font-bold text-slate-900">메뉴</h2>
      <p className="mb-4 text-sm text-slate-500">
        이해 → 암기 → 답안 → 복습 순서로 학습하면 효과적입니다.
      </p>
      <div className="space-y-6">
        {menuGroups.map((g) => (
          <section key={g.group}>
            <h3 className="mb-2 text-sm font-semibold text-slate-600">
              {g.group}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.items.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${m.color} text-xl`}
                  >
                    {m.emoji}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900 group-hover:text-brand-600">
                      {m.title}
                    </h4>
                    <p className="truncate text-xs text-slate-500">{m.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
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
