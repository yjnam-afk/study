import { NextRequest, NextResponse } from "next/server";
import { generateJSON, AIConfigError } from "@/lib/ai";
import { mnemonicPrompt, TUTOR_SYSTEM } from "@/lib/prompts";
import { buildGrounding, subnoteFor } from "@/lib/grounding";

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

/** 완성형 한글 음절(가~힣)인지 — 자모 낱자(ㄱ, ㅏ 등)는 false. */
function isSyllable(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return c >= 0xac00 && c <= 0xd7a3;
}

/** 키워드의 "두음" = 첫 글자(공백 제외, 한 음절/문자). */
function firstChar(term: string): string {
  return (term || "").trim().charAt(0) || "";
}

/**
 * 약한 모델이 두음을 음절이 아니라 자모 낱자(ㅍㅁㄱ…)나 엉뚱한 값으로
 * 내놓는 경우가 있어, 두음을 서버에서 결정적으로 바로잡는다.
 *  - 각 항목 initial = term의 첫 글자
 *  - mnemonic = 항목 두음 이어붙이기 (모델 값이 자모/불일치면 교체)
 */
function normalizeGroup(g: Group | undefined): Group | undefined {
  if (!g || !Array.isArray(g.items)) return g;
  g.items = g.items.map((it) => ({ ...it, initial: firstChar(it.term) }));
  const computed = g.items.map((it) => it.initial).join("");
  const m = (g.mnemonic || "").replace(/\s/g, "");
  // 모델 두음이 자모 낱자를 포함하거나, 두음 글자수가 항목수와 다르면 계산값 사용
  const hasJamo = /[ᄀ-ᇿ㄰-㆏]/.test(m);
  const lenOk = m.length === computed.length;
  if (!m || hasJamo || !lenOk) g.mnemonic = computed;
  return g;
}

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

    const data = await generateJSON<MnemonicSet>({
      system: TUTOR_SYSTEM,
      user: mnemonicPrompt(topic, grounding),
      temperature: 0.4,
    });
    // 두음을 서버에서 결정적으로 보정(모델이 자모/엉뚱한 두음을 내도 교정)
    normalizeGroup(data.intro);
    normalizeGroup(data.body);
    // 서브노트에 원본 두음/키워드가 있으면 함께 반환(사용자가 원본을 우선 확인)
    const subnote = subnoteFor({ topicId, topicTitle: topic });
    return NextResponse.json({ set: data, subnote });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "두음신공 생성에 실패했습니다." },
      { status },
    );
  }
}
