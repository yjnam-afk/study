import { NextRequest, NextResponse } from "next/server";
import { generateText, AIConfigError } from "@/lib/ai";
import { explainPrompt, TUTOR_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { topic, level } = (await req.json()) as {
      topic: string;
      level?: string;
    };

    if (!topic?.trim()) {
      return NextResponse.json({ error: "토픽을 입력하세요." }, { status: 400 });
    }

    const text = await generateText({
      system: TUTOR_SYSTEM,
      user: explainPrompt(topic, level || "수험생"),
      temperature: 0.5,
    });

    return NextResponse.json({ explanation: text });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status },
    );
  }
}
