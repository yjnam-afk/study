import { NextRequest, NextResponse } from "next/server";
import { generateText, parseJsonFromModel, AIConfigError } from "@/lib/ai";
import { mnemonicPrompt, TUTOR_SYSTEM } from "@/lib/prompts";
import topics from "@/data/topics.json";
import topicDetails from "@/data/topicDetails.json";

type Detail = {
  detail?: string;
  defKeywords?: string[];
  featureKeywords?: string[];
  applicationKeywords?: string[];
  plusKeywords?: string[];
};
const DETAILS = topicDetails as Record<string, Detail>;

/** 제목으로 토픽 id를 찾는다(직접 타이핑해도 데이터 연결되도록). */
function findIdByTitle(title: string): string | undefined {
  const t = title.trim();
  return topics.find((x) => x.title === t)?.id;
}

/** 선택/매칭된 토픽의 저장된 실제 내용을 "원문 그대로" 근거로 만든다. */
function groundingFrom(topicId?: string): string {
  if (!topicId) return "";
  const d = DETAILS[topicId];
  if (!d) return "";
  const parts: string[] = [];
  if (d.detail) parts.push(d.detail.slice(0, 1800));
  const kws = [
    ...(d.defKeywords || []),
    ...(d.featureKeywords || []),
    ...(d.applicationKeywords || []),
    ...(d.plusKeywords || []),
  ];
  const uniq = Array.from(new Set(kws));
  if (uniq.length) parts.push(`핵심 키워드: ${uniq.join(", ")}`);
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

    // 직접 타이핑이어도 제목이 데이터에 있으면 그 내용을 근거로 사용
    const resolvedId = topicId || findIdByTitle(topic);
    // 사용자가 붙여넣은 교재 + 토픽의 저장된 실제 내용을 함께 근거로 사용
    const grounding = [groundingFrom(resolvedId), reference]
      .filter((s) => s && s.trim())
      .join("\n\n");

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
