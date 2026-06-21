import { NextRequest, NextResponse } from "next/server";
import { generateText, AIConfigError } from "@/lib/ai";
import { storyPrompt, TUTOR_SYSTEM, ExamPeriod } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { period, question } = (await req.json()) as {
      period: ExamPeriod;
      question: string;
    };
    if (!question?.trim()) {
      return NextResponse.json({ error: "문제를 입력하세요." }, { status: 400 });
    }
    const examPeriod: ExamPeriod = period === "2교시" ? "2교시" : "1교시";

    const text = await generateText({
      system: TUTOR_SYSTEM,
      user: storyPrompt(examPeriod, question),
      temperature: 0.6,
    });

    return NextResponse.json({ guide: text });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "가이드 생성에 실패했습니다." },
      { status },
    );
  }
}
