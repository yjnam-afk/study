import { NextRequest, NextResponse } from "next/server";
import { redis, DBConfigError } from "@/lib/db";
import { hashPassword, makeToken, normalizeName } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { name: rawName, password } = (await req.json()) as {
      name: string;
      password: string;
    };
    const name = normalizeName(rawName);

    if (name.length < 1 || name.length > 20) {
      return NextResponse.json(
        { error: "이름은 1~20자로 입력하세요." },
        { status: 400 },
      );
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "비밀번호는 4자 이상으로 입력하세요." },
        { status: 400 },
      );
    }

    const exists = await redis<number>("EXISTS", `user:${name}`);
    if (exists === 1) {
      return NextResponse.json(
        { error: "이미 사용 중인 이름입니다. 다른 이름을 쓰거나 로그인하세요." },
        { status: 409 },
      );
    }

    await redis("SET", `user:${name}`, hashPassword(password));
    return NextResponse.json({ name, token: makeToken(name) });
  } catch (err) {
    const status = err instanceof DBConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "회원가입에 실패했습니다." },
      { status },
    );
  }
}
