import { NextRequest, NextResponse } from "next/server";
import { generateText, AIConfigError } from "@/lib/ai";
import { gradePrompt, TUTOR_SYSTEM, ExamPeriod } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { period, question, answer, reference } = (await req.json()) as {
      period: ExamPeriod;
      question: string;
      answer: string;
      reference?: string;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "문제를 입력하세요." }, { status: 400 });
    }
    if (!answer?.trim()) {
      return NextResponse.json(
        { error: "채점할 답안을 입력하세요." },
        { status: 400 },
      );
    }
    const examPeriod: ExamPeriod = period === "2교시" ? "2교시" : "1교시";

    const text = await generateText({
      system: TUTOR_SYSTEM,
      user: gradePrompt(examPeriod, question, answer, reference),
      temperature: 0.3,
    });

    return NextResponse.json({ feedback: text });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "채점에 실패했습니다." },
      { status },
    );
  }
}
