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
    const { name: rawName, token, score, stats } = (await req.json()) as {
      name: string;
      token: string;
      score: number;
      stats: ScoreStats;
    };
    const name = normalizeName(rawName);

    if (!name || !verifyToken(name, token)) {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 다시 로그인하세요." },
        { status: 401 },
      );
    }

    const safeScore = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;
    const payload = JSON.stringify({ ...stats, updatedAt: new Date().toISOString() });

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
