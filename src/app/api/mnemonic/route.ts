import { NextRequest, NextResponse } from "next/server";
import { generateText, parseJsonFromModel, AIConfigError } from "@/lib/ai";
import { mnemonicPrompt, TUTOR_SYSTEM } from "@/lib/prompts";
import topicDetails from "@/data/topicDetails.json";

type Detail = {
  detail?: string;
  defKeywords?: string[];
  featureKeywords?: string[];
  applicationKeywords?: string[];
  plusKeywords?: string[];
};
const DETAILS = topicDetails as Record<string, Detail>;

/** 선택된 토픽의 저장된 실제 내용(엑셀 정의·구성요소·키워드)을 근거 텍스트로 만든다. */
function groundingFrom(topicId?: string): string {
  if (!topicId) return "";
  const d = DETAILS[topicId];
  if (!d) return "";
  const parts: string[] = [];
  if (d.detail) parts.push(d.detail.slice(0, 1500));
  if (d.defKeywords?.length) parts.push(`정의 키워드: ${d.defKeywords.join(", ")}`);
  if (d.featureKeywords?.length)
    parts.push(`구성요소·특징: ${d.featureKeywords.join(", ")}`);
  if (d.applicationKeywords?.length)
    parts.push(`활용·동작: ${d.applicationKeywords.join(", ")}`);
  return parts.join("\n");
}

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

    // 사용자가 붙여넣은 교재 + 선택 토픽의 저장된 실제 내용을 함께 근거로 사용
    const grounding = [groundingFrom(topicId), reference]
      .filter((s) => s && s.trim())
      .join("\n\n");

    const raw = await generateText({
      system: TUTOR_SYSTEM,
      user: mnemonicPrompt(topic, grounding),
      temperature: 0.6,
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
