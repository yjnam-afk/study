import { NextRequest, NextResponse } from "next/server";
import { generateJSON, AIConfigError } from "@/lib/ai";
import { flashcardPrompt, TUTOR_SYSTEM } from "@/lib/prompts";
import { cached } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

type Flashcard = { front: string; back: string };

export async function POST(req: NextRequest) {
  try {
    const { topic, count } = (await req.json()) as {
      topic: string;
      count?: number;
    };

    if (!topic?.trim()) {
      return NextResponse.json({ error: "토픽을 입력하세요." }, { status: 400 });
    }
    const n = Math.min(Math.max(count || 6, 1), 20);

    const cards = await cached(`flashcards:${topic}:${n}`, 14 * 86400, () =>
      generateJSON<Flashcard[]>({
        system: TUTOR_SYSTEM,
        user: flashcardPrompt(topic, n),
        temperature: 0.6,
      }),
    );
    return NextResponse.json({ cards });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "카드 생성에 실패했습니다." },
      { status },
    );
  }
}
