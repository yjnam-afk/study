import { NextRequest, NextResponse } from "next/server";
import { generateJSON, AIConfigError } from "@/lib/ai";
import { hintPrompt, TUTOR_SYSTEM, ExamPeriod } from "@/lib/prompts";
import { cached, hashKey } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

type Hint = {
  keywords: string[];
  mnemonic: string;
  mnemonicHow: string;
  outline: string[];
};

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

    const hint = await cached<Hint>(
      `hint:${examPeriod}:${hashKey(question)}`,
      14 * 86400,
      () =>
        generateJSON<Hint>({
          system: TUTOR_SYSTEM,
          user: hintPrompt(examPeriod, question),
          temperature: 0.6,
        }),
    );
    return NextResponse.json({ hint });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "힌트 생성에 실패했습니다." },
      { status },
    );
  }
}
