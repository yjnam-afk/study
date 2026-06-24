import { NextRequest, NextResponse } from "next/server";
import { redis, DBConfigError } from "@/lib/db";
import { verifyToken, normalizeName } from "@/lib/serverAuth";

export const runtime = "nodejs";

/**
 * 계정별 학습 진도 동기화.
 *  - data 포함 POST → 저장(progress:<name>)
 *  - data 없는 POST → 불러오기({ data })
 * 로그인 토큰을 검증해 본인 데이터만 접근합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const { name: rawName, token, data } = (await req.json()) as {
      name: string;
      token: string;
      data?: unknown;
    };
    const name = normalizeName(rawName);
    if (!name || !verifyToken(name, token)) {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 다시 로그인하세요." },
        { status: 401 },
      );
    }

    const key = `progress:${name}`;

    // 저장
    if (data !== undefined && data !== null) {
      const payload = JSON.stringify({
        ...(data as object),
        savedAt: new Date().toISOString(),
      });
      // 과도한 용량 방지(약 1MB 상한)
      if (payload.length > 1_000_000) {
        return NextResponse.json(
          { error: "진도 데이터가 너무 큽니다." },
          { status: 413 },
        );
      }
      await redis("SET", key, payload);
      return NextResponse.json({ ok: true });
    }

    // 불러오기
    const raw = await redis<string | null>("GET", key);
    const parsed = raw ? JSON.parse(raw) : null;
    return NextResponse.json({ data: parsed });
  } catch (err) {
    const status = err instanceof DBConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "동기화에 실패했습니다." },
      { status },
    );
  }
}
