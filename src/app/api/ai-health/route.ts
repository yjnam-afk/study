import { NextRequest, NextResponse } from "next/server";
import { aiDiagnostics } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * AI 제공자 자가진단.
 *  - GET /api/ai-health        → 설정된 제공자·폴백 체인만(키 값은 노출 안 함)
 *  - GET /api/ai-health?ping=1 → 각 제공자에 초경량 요청을 보내 실제 살아있는지 확인
 *    (어떤 무료 한도가 소진됐는지, 어떤 키가 잘못됐는지 한눈에 파악)
 */
export async function GET(req: NextRequest) {
  const ping = req.nextUrl.searchParams.get("ping") === "1";
  try {
    const diag = await aiDiagnostics(ping);
    const healthy = diag.live ? diag.live.some((l) => l.ok) : undefined;
    return NextResponse.json({ healthy, ...diag });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "진단 실패" },
      { status: 500 },
    );
  }
}
