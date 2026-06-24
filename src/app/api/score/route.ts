import { NextRequest, NextResponse } from "next/server";
import { redis, DBConfigError } from "@/lib/db";
import { verifyToken, normalizeName } from "@/lib/serverAuth";

export const runtime = "nodejs";

export type ScoreStats = {
  progress: number;
  doneCount: number;
  totalRounds: number;
  quizTotal: number;
  quizCorrect: number;
  accuracy: number;
};

export async function POST(req: NextRequest) {
  try {
    const { name: rawName, token, stats } = (await req.json()) as {
      name: string;
      token: string;
      stats: ScoreStats;
    };
    const name = normalizeName(rawName);

    if (!name || !verifyToken(name, token)) {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 다시 로그인하세요." },
        { status: 401 },
      );
    }

    // 클라이언트가 보낸 score를 신뢰하지 않고 stats로 서버에서 재계산(랭킹 조작 방지)
    const n = (v: unknown) =>
      Number.isFinite(v) ? Math.max(0, Math.round(v as number)) : 0;
    const s = stats || ({} as ScoreStats);
    const safeStats: ScoreStats = {
      progress: Math.min(100, n(s.progress)),
      doneCount: n(s.doneCount),
      totalRounds: n(s.totalRounds),
      quizTotal: n(s.quizTotal),
      quizCorrect: Math.min(n(s.quizCorrect), n(s.quizTotal)),
      accuracy: Math.min(100, n(s.accuracy)),
    };
    const safeScore =
      safeStats.doneCount * 100 +
      safeStats.totalRounds * 10 +
      safeStats.quizCorrect * 5;
    const payload = JSON.stringify({
      ...safeStats,
      updatedAt: new Date().toISOString(),
    });

    await redis("ZADD", "lb", safeScore, name);
    await redis("SET", `stats:${name}`, payload);

    return NextResponse.json({ ok: true, score: safeScore });
  } catch (err) {
    const status = err instanceof DBConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "기록 저장에 실패했습니다." },
      { status },
    );
  }
}
