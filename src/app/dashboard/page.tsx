"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import topics from "@/data/topics.json";
import { ReviewItem, loadReview, getItem } from "@/lib/storage";
import { QuizStats, loadStats, loadNotes } from "@/lib/notes";

export default function DashboardPage() {
  const [review, setReview] = useState<Record<string, ReviewItem>>({});
  const [stats, setStats] = useState<QuizStats>({
    total: 0,
    correct: 0,
    lastAt: null,
  });
  const [notesCount, setNotesCount] = useState(0);

  useEffect(() => {
    setReview(loadReview());
    setStats(loadStats());
    setNotesCount(loadNotes().length);
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

  // 카테고리별 회독 진행도
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
      <PageHeader
        title="📊 학습 대시보드"
        desc="회독 진도, 퀴즈 정답률, 오답 현황을 한눈에 확인합니다. (이 브라우저 기준)"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="완료 진도" value={`${progress}%`} accent />
        <Stat label="퀴즈 정답률" value={stats.total > 0 ? `${accuracy}%` : "—"} />
        <Stat label="총 회독 수" value={`${totalRounds}회`} />
        <Stat label="오답노트" value={`${notesCount}개`} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          학습 중 {learningCount}개 · 시작 전 {total - doneCount - learningCount}개
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">퀴즈 성과</h3>
        {stats.total > 0 ? (
          <p className="text-sm text-slate-600">
            지금까지 <span className="font-semibold">{stats.total}</span>문제 중{" "}
            <span className="font-semibold text-emerald-600">
              {stats.correct}
            </span>
            문제 정답 (정답률 {accuracy}%).{" "}
            {notesCount > 0 && (
              <>
                틀린 문제는{" "}
                <Link href="/notes" className="font-medium text-brand-600 hover:underline">
                  오답노트
                </Link>
                에서 복습하세요.
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            아직 푼 퀴즈가 없습니다.{" "}
            <Link href="/memorize" className="font-medium text-brand-600 hover:underline">
              암기 퀴즈
            </Link>
            를 풀면 정답률이 기록됩니다.
          </p>
        )}
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
