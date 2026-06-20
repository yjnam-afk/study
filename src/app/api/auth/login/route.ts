import { NextRequest, NextResponse } from "next/server";
import { redis, DBConfigError } from "@/lib/db";
import { verifyPassword, makeToken, normalizeName } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { name: rawName, password } = (await req.json()) as {
      name: string;
      password: string;
    };
    const name = normalizeName(rawName);

    if (!name || !password) {
      return NextResponse.json(
        { error: "이름과 비밀번호를 입력하세요." },
        { status: 400 },
      );
    }

    const stored = await redis<string | null>("GET", `user:${name}`);
    if (!stored || !verifyPassword(password, stored)) {
      return NextResponse.json(
        { error: "이름이 없거나 비밀번호가 틀렸습니다." },
        { status: 401 },
      );
    }

    return NextResponse.json({ name, token: makeToken(name) });
  } catch (err) {
    const status = err instanceof DBConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "로그인에 실패했습니다." },
      { status },
    );
  }
}
