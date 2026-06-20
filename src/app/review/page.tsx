"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import topics from "@/data/topics.json";
import {
  ReviewItem,
  loadReview,
  saveReview,
  getItem,
  markReviewed,
  resetItem,
} from "@/lib/storage";

const STATUS_LABEL: Record<string, string> = {
  todo: "시작 전",
  learning: "학습 중",
  done: "완료",
};
const STATUS_STYLE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-500",
  learning: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export default function ReviewPage() {
  const [state, setState] = useState<Record<string, ReviewItem>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadReview());
    setReady(true);
  }, []);

  function update(next: Record<string, ReviewItem>) {
    setState(next);
    saveReview(next);
  }

  const total = topics.length;
  const doneCount = topics.filter(
    (t) => getItem(state, t.id).status === "done",
  ).length;
  const totalRounds = topics.reduce(
    (sum, t) => sum + getItem(state, t.id).rounds,
    0,
  );
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="🔁 회독 관리"
        desc="토픽별 회독 횟수와 진도를 기록합니다. 3회독 시 완료로 표시됩니다. (진도는 이 브라우저에 저장됩니다.)"
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="전체 토픽" value={`${total}개`} />
        <Stat label="완료(3회독)" value={`${doneCount}개`} />
        <Stat label="총 회독 수" value={`${totalRounds}회`} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-slate-700">완료 진도</span>
          <span className="text-slate-500">{progress}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {topics.map((t) => {
          const item = ready
            ? getItem(state, t.id)
            : { rounds: 0, status: "todo" as const };
          return (
            <div
              key={t.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                  <span className="text-xs text-slate-400">{t.category}</span>
                </div>
                <h3 className="mt-1 font-semibold text-slate-900">{t.title}</h3>
                <p className="truncate text-sm text-slate-500">{t.summary}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="flex items-center gap-1" title="회독 횟수">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.rounds >= n ? "bg-brand-600" : "bg-slate-200"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-sm font-medium text-slate-600">
                    {item.rounds}회
                  </span>
                </div>

                <Link
                  href={`/explain`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  복습
                </Link>
                <button
                  onClick={() => update(markReviewed(state, t.id))}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  +1 회독
                </button>
                {item.rounds > 0 && (
                  <button
                    onClick={() => update(resetItem(state, t.id))}
                    className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-red-500"
                    title="초기화"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
