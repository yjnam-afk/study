import { NextRequest, NextResponse } from "next/server";
import { generateText, AIConfigError } from "@/lib/ai";
import { answerPrompt, TUTOR_SYSTEM, ExamPeriod } from "@/lib/prompts";

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
      user: answerPrompt(examPeriod, question),
      temperature: 0.4,
    });

    return NextResponse.json({ answer: text });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status },
    );
  }
}
