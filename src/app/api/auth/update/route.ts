import { NextRequest, NextResponse } from "next/server";
import { redis, DBConfigError } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  makeToken,
  verifyToken,
  normalizeName,
} from "@/lib/serverAuth";

export const runtime = "nodejs";

/**
 * 회원정보(이름·비밀번호) 수정.
 *  - currentPassword 검증 필수
 *  - newPassword: 비밀번호 변경
 *  - newName: 이름 변경 → user/stats/progress/리더보드 키를 새 이름으로 이전
 * 성공 시 새 토큰을 반환(이름이 바뀌면 토큰도 바뀜).
 */
export async function POST(req: NextRequest) {
  try {
    const {
      name: rawName,
      token,
      currentPassword,
      newName: rawNew,
      newPassword,
    } = (await req.json()) as {
      name: string;
      token: string;
      currentPassword: string;
      newName?: string;
      newPassword?: string;
    };

    const name = normalizeName(rawName);
    if (!name || !verifyToken(name, token)) {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 다시 로그인하세요." },
        { status: 401 },
      );
    }

    const stored = await redis<string | null>("GET", `user:${name}`);
    if (!stored || !verifyPassword(currentPassword || "", stored)) {
      return NextResponse.json(
        { error: "현재 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    // 비밀번호 변경값(없으면 기존 유지)
    let nextHash = stored;
    if (newPassword !== undefined && newPassword !== "") {
      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: "새 비밀번호는 4자 이상이어야 합니다." },
          { status: 400 },
        );
      }
      nextHash = hashPassword(newPassword);
    }

    const newName = rawNew !== undefined ? normalizeName(rawNew) : name;
    const renaming = newName !== name;

    if (renaming) {
      if (newName.length < 1 || newName.length > 20) {
        return NextResponse.json(
          { error: "이름은 1~20자로 입력하세요." },
          { status: 400 },
        );
      }
      const taken = await redis<number>("EXISTS", `user:${newName}`);
      if (taken === 1) {
        return NextResponse.json(
          { error: "이미 사용 중인 이름입니다." },
          { status: 409 },
        );
      }
      // 키 이전: user / stats / progress / 리더보드 점수
      await redis("SET", `user:${newName}`, nextHash);
      for (const k of ["stats", "progress"]) {
        const v = await redis<string | null>("GET", `${k}:${name}`);
        if (v !== null && v !== undefined) {
          await redis("SET", `${k}:${newName}`, v);
          await redis("DEL", `${k}:${name}`);
        }
      }
      const score = await redis<string | null>("ZSCORE", "lb", name);
      if (score !== null && score !== undefined) {
        await redis("ZADD", "lb", Number(score), newName);
        await redis("ZREM", "lb", name);
      }
      await redis("DEL", `user:${name}`);
    } else if (nextHash !== stored) {
      // 비밀번호만 변경
      await redis("SET", `user:${name}`, nextHash);
    }

    return NextResponse.json({ name: newName, token: makeToken(newName) });
  } catch (err) {
    const status = err instanceof DBConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "정보 수정에 실패했습니다." },
      { status },
    );
  }
}
