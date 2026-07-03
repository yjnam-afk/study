import { NextRequest, NextResponse } from "next/server";
import { generateText, AIConfigError } from "@/lib/ai";
import { storyPrompt, TUTOR_SYSTEM, ExamPeriod } from "@/lib/prompts";
import { buildGrounding } from "@/lib/grounding";
import { cached, hashKey } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { period, question, reference, topicId, topicTitle } =
      (await req.json()) as {
        period: ExamPeriod;
        question: string;
        reference?: string;
        topicId?: string;
        topicTitle?: string;
      };
    if (!question?.trim()) {
      return NextResponse.json({ error: "문제를 입력하세요." }, { status: 400 });
    }
    const examPeriod: ExamPeriod = period === "2교시" ? "2교시" : "1교시";
    const grounding = buildGrounding({ topicId, topicTitle, reference });

    const text = await cached(
      // 교재 데이터 수정 시 자동 재생성되도록 grounding을 키에 포함.
      `story:${examPeriod}:${hashKey(question + "|" + grounding)}`,
      60 * 86400,
      () =>
        generateText({
          system: TUTOR_SYSTEM,
          user: storyPrompt(examPeriod, question, grounding),
          temperature: 0.6,
        }),
    );

    return NextResponse.json({ guide: text });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "가이드 생성에 실패했습니다." },
      { status },
    );
  }
}
