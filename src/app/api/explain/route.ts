import { NextRequest, NextResponse } from "next/server";
import { generateText, AIConfigError } from "@/lib/ai";
import { explainPrompt, TUTOR_SYSTEM } from "@/lib/prompts";
import { buildGrounding } from "@/lib/grounding";
import { cached, hashKey } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { topic, level, topicId } = (await req.json()) as {
      topic: string;
      level?: string;
      topicId?: string;
    };

    if (!topic?.trim()) {
      return NextResponse.json({ error: "토픽을 입력하세요." }, { status: 400 });
    }

    const lv = level || "수험생";
    // 우리 토픽 데이터(서브노트)를 근거로 설명 → ACID 등 교재 핵심이 빠지지 않게.
    const grounding = buildGrounding({ topicId, topicTitle: topic });
    const text = await cached(
      `explain:v2:${topic}:${lv}:${grounding ? hashKey(grounding) : "-"}`,
      14 * 86400,
      () =>
        generateText({
          system: TUTOR_SYSTEM,
          user: explainPrompt(topic, lv, grounding),
          temperature: 0.5,
        }),
    );

    return NextResponse.json({ explanation: text });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status },
    );
  }
}
