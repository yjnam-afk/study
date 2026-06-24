"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import topics from "@/data/topics.json";
import { ReviewItem, loadReview, getItem, isDue } from "@/lib/storage";
import { QuizStats, loadStats, loadNotes } from "@/lib/notes";
import { loadSession } from "@/lib/auth";
import {
  CoachPlan,
  buildPlan,
  mnemonicLink,
  explainLink,
} from "@/lib/coach";

const toneClass: Record<string, string> = {
  rose: "border-rose-200 bg-rose-50 hover:border-rose-300",
  amber: "border-amber-200 bg-amber-50 hover:border-amber-300",
  violet: "border-violet-200 bg-violet-50 hover:border-violet-300",
  emerald: "border-emerald-200 bg-emerald-50 hover:border-emerald-300",
  sky: "border-sky-200 bg-sky-50 hover:border-sky-300",
};

const menuGroups = [
  {
    group: "🧠 1단계 · 키워드 암기 (소설의 재료)",
    items: [
      {
        href: "/mnemonic",
        emoji: "🥷",
        title: "두음신공",
        desc: "핵심 키워드를 두음으로 암기 → 객관식·주관식 확인",
        color: "from-violet-500 to-purple-600",
      },
      {
        href: "/memorize",
        emoji: "🧠",
        title: "암기 (카드·퀴즈)",
        desc: "플래시카드·퀴즈로 키워드 반복 암기",
        color: "from-amber-500 to-orange-600",
      },
      {
        href: "/notes",
        emoji: "📕",
        title: "오답노트",
        desc: "자주 틀린 키워드 집중 복습",
        color: "from-cyan-500 to-sky-600",
      },
    ],
  },
  {
    group: "✍️ 2단계 · 소설 쓰기 (키워드로 답안 작성)",
    items: [
      {
        href: "/answer",
        emoji: "📝",
        title: "답안지 작성",
        desc: "키워드로 답안 '소설' 작성 + 키워드·두음 힌트 + 소설 쓰는 법",
        color: "from-blue-500 to-indigo-600",
      },
      {
        href: "/exam",
        emoji: "📜",
        title: "기출문제",
        desc: "실제 기출문제로 답안 연습·자가채점 (회차·교시별)",
        color: "from-amber-500 to-yellow-600",
      },
      {
        href: "/grade",
        emoji: "✅",
        title: "AI 자가채점",
        desc: "내가 쓴 소설을 방법론 기준으로 코칭·채점",
        color: "from-rose-500 to-red-600",
      },
    ],
  },
  {
    group: "📚 보조 · 개념 이해 · 복습",
    items: [
      {
        href: "/explain",
        emoji: "💡",
        title: "토픽 설명",
        desc: "어려운 개념을 비유·도식으로 이해",
        color: "from-emerald-500 to-teal-600",
      },
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
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const refresh = () => {
      const rev = loadReview();
      const st = loadStats();
      const notes = loadNotes();
      setReview(rev);
      setStats(st);
      setNotesCount(notes.length);
      setPlan(buildPlan(rev, notes, st));
      setUserName(loadSession()?.name || "");
    };
    refresh();
    // 계정 동기화가 끝나면 코치를 다시 계산(다른 기기 진도 반영)
    window.addEventListener("progress-synced", refresh);
    return () => window.removeEventListener("progress-synced", refresh);
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
      <section className="mb-6 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-7 text-white shadow-lg">
        <p className="text-sm font-medium text-brand-100">
          {userName ? `${userName} 님, 오늘의 학습 코치예요` : "오늘의 학습 코치"}
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {plan ? plan.headline : "기술사 답안은 '소설'입니다 ✍️"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-50">
          {plan
            ? plan.subline
            : "키워드를 암기하고, 그 키워드로 답안을 써보세요."}
        </p>
        {plan?.primary && (
          <Link
            href={plan.primary.href}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            지금 시작하기 · {plan.primary.label} →
          </Link>
        )}
      </section>

      {plan && plan.tasks.length > 0 && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              ✅ 오늘의 학습 순서
            </h2>
            <span className="text-xs text-slate-400">
              코치가 급한 순으로 정렬했어요
            </span>
          </div>

          {plan.goal.target > 0 && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-600">
                  🎯 오늘의 목표 {plan.goal.done}/{plan.goal.target} 회독
                </span>
                <span className="text-slate-400">
                  {Math.round((plan.goal.done / plan.goal.target) * 100)}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((plan.goal.done / plan.goal.target) * 100))}%`,
                  }}
                />
              </div>
              {plan.goal.done >= plan.goal.target && (
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  🎉 오늘 목표 달성! 새 토픽으로 더 나아가도 좋아요.
                </p>
              )}
            </div>
          )}

          <ol className="space-y-2">
            {plan.tasks.map((t, i) => (
              <li key={t.kind + i}>
                <Link
                  href={t.href}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition hover:shadow-sm ${toneClass[t.tone]}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/70 text-xs font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <span className="text-lg">{t.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">
                      {t.title}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {t.detail}
                    </span>
                  </span>
                  <span className="shrink-0 text-slate-400">→</span>
                </Link>
              </li>
            ))}
          </ol>

          {plan.newTopics.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="mb-2 text-xs font-medium text-slate-500">
                🆕 오늘 새로 시작하면 좋은 토픽 (탭 한 번이면 바로 학습)
              </div>
              <div className="space-y-2">
                {plan.newTopics.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2"
                  >
                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                      {t.importance}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                      {t.title}
                    </span>
                    <span className="hidden text-[10px] text-slate-400 sm:inline">
                      {t.category}
                    </span>
                    <Link
                      href={mnemonicLink(t, true)}
                      className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
                    >
                      🥷 암기
                    </Link>
                    <Link
                      href={explainLink(t, true)}
                      className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      💡 설명
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
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
