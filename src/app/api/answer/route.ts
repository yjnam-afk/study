import { NextRequest, NextResponse } from "next/server";
import { generateText, AIConfigError } from "@/lib/ai";
import { answerPrompt, TUTOR_SYSTEM, ExamPeriod } from "@/lib/prompts";
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

    // 토픽 실데이터(엑셀 서브노트) + 붙여넣은 교재를 근거로 답안 작성
    const grounding = buildGrounding({ topicId, topicTitle, reference });

    // 같은 문제(같은 근거)면 캐시 반환 → 기출 등 반복 생성 시 AI 한도 절약.
    // 교재 데이터(grounding)를 키에 포함 → 토픽 데이터를 고치면 답안도 자동 재생성.
    const cacheKey = `answer:${examPeriod}:${hashKey(question + "|" + (reference || "") + "|" + grounding)}`;
    const text = await cached(cacheKey, 60 * 86400, () =>
      generateText({
        system: TUTOR_SYSTEM,
        user: answerPrompt(examPeriod, question, grounding),
        temperature: 0.4,
      }),
    );

    return NextResponse.json({ answer: text });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status },
    );
  }
}
