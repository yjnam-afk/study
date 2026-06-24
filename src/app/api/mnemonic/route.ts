import { NextRequest, NextResponse } from "next/server";
import { generateText, parseJsonFromModel, AIConfigError } from "@/lib/ai";
import { mnemonicPrompt, TUTOR_SYSTEM } from "@/lib/prompts";

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
    const { topic } = (await req.json()) as { topic: string };
    if (!topic?.trim()) {
      return NextResponse.json({ error: "토픽을 입력하세요." }, { status: 400 });
    }

    const raw = await generateText({
      system: TUTOR_SYSTEM,
      user: mnemonicPrompt(topic),
      temperature: 0.7,
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
