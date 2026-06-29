import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 현재 살아있는 배포의 빌드 ID. 클라이언트가 자기 빌드 ID와 비교해 새 배포를 감지한다. */
export async function GET() {
  return NextResponse.json(
    { id: process.env.NEXT_PUBLIC_BUILD_ID || "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
