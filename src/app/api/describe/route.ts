import { NextRequest, NextResponse } from "next/server";
import { generateJSON, AIConfigError } from "@/lib/ai";
import { describePrompt, TUTOR_SYSTEM } from "@/lib/prompts";
import { cached, hashKey } from "@/lib/cache";
import { sanitizeKo } from "@/lib/sanitize";

export const runtime = "nodejs";
export const maxDuration = 60;

type Desc = { term: string; desc: string };

/** 키워드별 '모범 설명'을 생성(데이터-우선 토픽의 빈 모범설명 보완). 결과는 캐시. */
export async function POST(req: NextRequest) {
  try {
    const { topic, terms } = (await req.json()) as {
      topic: string;
      terms: string[];
    };
    if (!topic?.trim() || !Array.isArray(terms) || terms.length === 0) {
      return NextResponse.json(
        { error: "토픽과 키워드가 필요합니다." },
        { status: 400 },
      );
    }
    const list = terms.slice(0, 12).map((t) => String(t));
    const descs = await cached<Desc[]>(
      `describe:v3:${topic}:${hashKey(list.join("|"))}`,
      30 * 86400,
      () =>
        generateJSON<Desc[]>({
          system: TUTOR_SYSTEM,
          user: describePrompt(topic, list),
          temperature: 0.4,
        }),
    );
    const clean = (descs || []).map((d) => ({
      term: sanitizeKo(d.term),
      desc: sanitizeKo(d.desc),
    }));
    return NextResponse.json({ descs: clean });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "모범 설명 생성 실패" },
      { status },
    );
  }
}
