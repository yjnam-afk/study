"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import topics from "@/data/topics.json";
import { ReviewItem, loadReview, getItem, isDue } from "@/lib/storage";
import { QuizStats, loadStats, loadNotes } from "@/lib/notes";
import { loadSession } from "@/lib/auth";
import { CoachPlan, buildPlan, mnemonicLink } from "@/lib/coach";
import ShareButton from "@/components/ShareButton";
import {
  PlanTopic,
  orderedTopics,
  todayIndex,
  effectiveTopicsForDay,
  getPerDay,
  loadTopicDone,
  saveTopicDone,
  loadOverrides,
  PLAN_TOTAL_DAYS,
} from "@/lib/plan";

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
        href: "/plan",
        emoji: "🗓️",
        title: "데일리 계획 (달력)",
        desc: "내일~8월 말, 매일 배정되는 토픽을 달력으로",
        color: "from-rose-500 to-pink-600",
      },
      {
        href: "/commute",
        emoji: "🚇",
        title: "지하철 모드 (틈새 두음)",
        desc: "한 손으로 넘기는 두음 카드 · AI 없이 즉시 · 통신 약해도 OK",
        color: "from-slate-500 to-gray-600",
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

  // 데일리 계획 — 오늘의 토픽(메인)
  const [dayIdx, setDayIdx] = useState(-1);
  const [todayTopics, setTodayTopics] = useState<PlanTopic[]>([]);
  const [topicDone, setTopicDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ti = todayIndex();
    setDayIdx(ti);
    if (ti >= 0 && ti < PLAN_TOTAL_DAYS) {
      setTodayTopics(
        effectiveTopicsForDay(orderedTopics(), ti, getPerDay(), loadOverrides()),
      );
    }
    setTopicDone(loadTopicDone());
  }, []);

  function toggleTopicDone(id: string) {
    const next = new Set(topicDone);
    next.has(id) ? next.delete(id) : next.add(id);
    setTopicDone(next);
    saveTopicDone(next);
  }
  const todayDoneN = todayTopics.filter((t) => topicDone.has(t.id)).length;
  const todayAllDone =
    todayTopics.length > 0 && todayDoneN === todayTopics.length;

  useEffect(() => {
    const refresh = () => {
      const rev = loadReview();
      const st = loadStats();
      const notes = loadNotes();
      setReview(rev);
      setStats(st);
      setNotesCount(notes.length);
      // 오늘의 데일리 계획 토픽을 코치에 넘겨 "오늘의 학습"을 "오늘의 토픽"과 동일하게 맞춘다.
      const ti = todayIndex();
      const planToday =
        ti >= 0 && ti < PLAN_TOTAL_DAYS
          ? effectiveTopicsForDay(orderedTopics(), ti, getPerDay(), loadOverrides())
          : undefined;
      setPlan(buildPlan(rev, notes, st, Date.now(), planToday));
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
      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-700 to-violet-700 p-7 text-white shadow-lg sm:p-9">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          📖 스파르타 소설클럽
        </span>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
          기술사 답안은{" "}
          <span className="underline decoration-amber-300 decoration-4 underline-offset-4">
            소설
          </span>
          이다 ✍️
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-50 sm:text-base">
          핵심은 <b className="text-white">키워드로 분량을 채워 그럴듯하게 쓰는 글쓰기</b>.
          어려운 토픽도 키워드만 외우면 한 편의 소설처럼 답안을 완성할 수 있어요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium">
            🥷 1단계 · 키워드 암기(두음신공)
          </span>
          <span className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium">
            ✍️ 2단계 · 키워드로 답안 쓰기
          </span>
        </div>

        {/* 개인화 코치 — 클럽 소개 아래에 자연스럽게 */}
        <div className="mt-5 rounded-xl bg-black/15 p-4">
          <p className="text-sm font-semibold text-white">
            {userName ? `${userName} 님 — ` : ""}
            {plan ? plan.headline : "오늘부터 시작해 볼까요? 🚀"}
          </p>
          {plan?.subline && (
            <p className="mt-1 text-xs leading-relaxed text-brand-100">
              {plan.subline}
            </p>
          )}
          {plan?.primary && (
            <Link
              href={plan.primary.href}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-sm transition hover:bg-brand-50"
            >
              지금 시작하기 →
            </Link>
          )}
        </div>
      </section>

      {/* 메인 — 오늘의 데일리 계획 토픽 */}
      <div className="mb-6 rounded-2xl border-2 border-rose-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            🗓️ 오늘의 토픽{" "}
            {dayIdx >= 0 && dayIdx < PLAN_TOTAL_DAYS && (
              <span className="text-rose-500">· Day {dayIdx + 1}</span>
            )}
          </h2>
          <Link href="/plan" className="text-xs font-medium text-rose-600 hover:underline">
            전체 달력 →
          </Link>
        </div>

        {dayIdx < 0 ? (
          <p className="rounded-lg bg-rose-50 p-4 text-sm text-slate-600">
            데일리 계획은 <b>6/29부터</b> 시작돼요. 그 전엔 두음신공·지하철 모드로
            예열하세요!
          </p>
        ) : dayIdx >= PLAN_TOTAL_DAYS ? (
          <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
            🎉 8월 말 계획을 모두 마쳤어요! 복습·기출로 마무리하세요.
          </p>
        ) : todayTopics.length === 0 ? (
          <p className="text-sm text-slate-500">오늘 배정된 토픽이 없습니다.</p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                학습한 토픽을 체크하세요 · {todayDoneN}/{todayTopics.length} 완료
              </span>
              {todayAllDone && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600">
                  🌟 참 잘했어요!
                </span>
              )}
            </div>
            <ol className="space-y-2">
              {todayTopics.map((t, i) => {
                const checked = topicDone.has(t.id);
                return (
                  <li
                    key={t.id}
                    className={`flex items-center gap-2 rounded-lg border p-2 ${
                      checked
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => toggleTopicDone(t.id)}
                      aria-label="완료"
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs font-bold transition ${
                        checked
                          ? "border-emerald-400 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-transparent hover:border-emerald-400"
                      }`}
                    >
                      ✓
                    </button>
                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                      {t.importance}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        checked ? "text-slate-400 line-through" : "text-slate-800"
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="hidden text-[10px] text-slate-400 sm:inline">
                      {t.category}
                    </span>
                    <Link
                      href={mnemonicLink(t, true)}
                      className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
                    >
                      🥷 학습
                    </Link>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href="/commute"
                className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                🚇 지하철 모드로 카드 넘기기
              </Link>
            </div>
          </>
        )}
      </div>

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
        </div>
      )}

      <h2 className="mb-3 mt-10 text-lg font-bold text-slate-900">
        📊 내 학습 현황
      </h2>
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

      <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-slate-600">
          🏆 친구를 초대해 <b>학습 랭킹</b>으로 같이 경쟁해요.
        </p>
        <ShareButton
          title="스파르타 소설클럽 — 정보관리기술사 학습 같이해요!"
          text="기술사 답안은 소설이다 ✍️ 두음신공 암기 + 키워드 답안쓰기"
        />
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
