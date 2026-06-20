"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Spinner, ErrorBox, Button } from "@/components/ui";
import {
  loadSession,
  submitScore,
  buildMyStats,
  computeScore,
  Session,
} from "@/lib/auth";
import type { LeaderboardRow } from "@/app/api/leaderboard/route";

export default function LeaderboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [myScore, setMyScore] = useState<number | null>(null);

  const fetchBoard = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "랭킹을 불러오지 못했습니다.");
      setRows(data.leaderboard || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const sync = useCallback(
    async (s: Session) => {
      setSubmitting(true);
      try {
        const sc = await submitScore(s);
        setMyScore(sc);
        await fetchBoard();
      } catch (e) {
        setError(e instanceof Error ? e.message : "기록 전송 실패");
      } finally {
        setSubmitting(false);
      }
    },
    [fetchBoard],
  );

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (s) {
      setMyScore(computeScore(buildMyStats()));
      void sync(s); // 로그인 상태면 내 최신 기록을 올리고 랭킹 갱신
    } else {
      void fetchBoard();
    }
  }, [sync, fetchBoard]);

  return (
    <div>
      <PageHeader
        title="🏆 학습 랭킹"
        desc="회독·퀴즈 정답 기록으로 다른 사람들과 경쟁하세요. 점수 = 완료토픽×100 + 회독수×10 + 퀴즈정답×5"
      />

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {session ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-brand-600">{session.name}</span>{" "}
              님 · 내 점수{" "}
              <span className="font-semibold">{myScore ?? "—"}</span>점
            </p>
            <Button onClick={() => sync(session)} disabled={submitting}>
              {submitting ? "기록 올리는 중…" : "내 기록 갱신"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              랭킹에 참여하려면 로그인하세요.
            </p>
            <Link
              href="/login"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              로그인 / 회원가입
            </Link>
          </div>
        )}
      </div>

      {loading && <Spinner label="랭킹을 불러오는 중…" />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          아직 랭킹에 기록이 없습니다. 로그인 후 첫 주자가 되어 보세요!
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">순위</th>
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-right">점수</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">완료</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">회독</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">정답률</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const mine = session && r.name === session.name;
                return (
                  <tr
                    key={r.name}
                    className={`border-t border-slate-100 ${mine ? "bg-brand-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {medal(r.rank)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.name}
                      {mine && (
                        <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">
                          나
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-600">
                      {r.score}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-slate-500 sm:table-cell">
                      {r.doneCount ?? "-"}개
                    </td>
                    <td className="hidden px-4 py-3 text-right text-slate-500 sm:table-cell">
                      {r.totalRounds ?? "-"}회
                    </td>
                    <td className="hidden px-4 py-3 text-right text-slate-500 sm:table-cell">
                      {r.quizTotal ? `${r.accuracy ?? 0}%` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function medal(rank: number): string {
  if (rank === 1) return "🥇 1";
  if (rank === 2) return "🥈 2";
  if (rank === 3) return "🥉 3";
  return `${rank}`;
}
