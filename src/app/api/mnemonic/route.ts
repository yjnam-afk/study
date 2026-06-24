import { NextRequest, NextResponse } from "next/server";
import { generateText, parseJsonFromModel, AIConfigError } from "@/lib/ai";
import { mnemonicPrompt, TUTOR_SYSTEM } from "@/lib/prompts";
import { buildGrounding } from "@/lib/grounding";

export const runtime = "nodejs";
export const maxDuration = 60;

type Group = {
  items: { term: string; initial: string; desc: string }[];
  mnemonic: string;
  mnemonicHow: string;
  definition?: string[];
  table?: { col1: string; col2: string; col3: string }[];
};
type MnemonicSet = {
  topic: string;
  intro: Group;
  body: Group;
  mc: {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
  recall: { prompt: string; answers: string[] };
};

export async function POST(req: NextRequest) {
  try {
    const { topic, topicId, reference } = (await req.json()) as {
      topic: string;
      topicId?: string;
      reference?: string;
    };
    if (!topic?.trim()) {
      return NextResponse.json({ error: "토픽을 입력하세요." }, { status: 400 });
    }

    // 토픽 실데이터(엑셀) + 붙여넣은 교재를 근거로 사용(제목 자동 매칭 포함)
    const grounding = buildGrounding({ topicId, topicTitle: topic, reference });

    const raw = await generateText({
      system: TUTOR_SYSTEM,
      user: mnemonicPrompt(topic, grounding),
      temperature: 0.4,
    });

    const data = parseJsonFromModel<MnemonicSet>(raw);
    return NextResponse.json({ set: data });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "두음신공 생성에 실패했습니다." },
      { status },
    );
  }
}
