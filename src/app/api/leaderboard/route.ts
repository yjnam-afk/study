import { NextResponse } from "next/server";
import { redis, DBConfigError } from "@/lib/db";

export const runtime = "nodejs";

export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  progress?: number;
  doneCount?: number;
  totalRounds?: number;
  quizTotal?: number;
  quizCorrect?: number;
  accuracy?: number;
  updatedAt?: string;
};

export async function GET() {
  try {
    // 상위 50명, 점수 내림차순 (member, score, member, score, ...)
    const flat = await redis<string[]>(
      "ZREVRANGE",
      "lb",
      0,
      49,
      "WITHSCORES",
    );

    const entries: { name: string; score: number }[] = [];
    for (let i = 0; i < (flat?.length || 0); i += 2) {
      entries.push({ name: flat[i], score: Number(flat[i + 1]) });
    }

    let statsList: (string | null)[] = [];
    if (entries.length > 0) {
      statsList = await redis<(string | null)[]>(
        "MGET",
        ...entries.map((e) => `stats:${e.name}`),
      );
    }

    const leaderboard: LeaderboardRow[] = entries.map((e, i) => {
      let extra: Record<string, unknown> = {};
      try {
        if (statsList[i]) extra = JSON.parse(statsList[i] as string);
      } catch {
        extra = {};
      }
      return { rank: i + 1, name: e.name, score: e.score, ...extra };
    });

    return NextResponse.json({ leaderboard });
  } catch (err) {
    const status = err instanceof DBConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "랭킹을 불러오지 못했습니다." },
      { status },
    );
  }
}
