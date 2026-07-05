import { NextRequest, NextResponse } from "next/server";
import { generateText, AIConfigError } from "@/lib/ai";
import { audioScriptPrompt, TUTOR_SYSTEM } from "@/lib/prompts";
import { buildGrounding } from "@/lib/grounding";
import { cached, hashKey } from "@/lib/cache";
import { sanitizeKo } from "@/lib/sanitize";

export const runtime = "nodejs";
export const maxDuration = 60;

/** NotebookLM식 오디오 강의 대본(진행자/전문가 대화) 생성. 결과는 장기 캐시. */
export async function POST(req: NextRequest) {
  try {
    const { topic, topicId } = (await req.json()) as {
      topic: string;
      topicId?: string;
    };
    if (!topic?.trim()) {
      return NextResponse.json({ error: "토픽을 입력하세요." }, { status: 400 });
    }

    const grounding = buildGrounding({ topicId, topicTitle: topic });

    // 완성 검증: [끝] 마커가 없으면 "중간에 잘린" 대본 → 캐시 금지·재시도.
    const isComplete = (t: string): boolean => {
      if (!t || t.length < 500) return false;
      const turns = (t.match(/^(진행자|전문가)\s*[:：]/gm) || []).length;
      return turns >= 8 && /\[끝\]\s*$/.test(t.trim());
    };

    const gen = () =>
      generateText({
        system: TUTOR_SYSTEM,
        user: audioScriptPrompt(topic, grounding),
        temperature: 0.7,
        valid: isComplete, // 잘린 대본이면 다음 제공자로 폴백
      });

    const script = await cached(
      `audioscript:v2:${topic}:${grounding ? hashKey(grounding) : "-"}`,
      90 * 86400,
      // generateText 내부에서 이미 체인 순회·검증·폴백을 한다. 중복 재시도로
      // maxDuration(60s)을 넘기지 않도록 단일 호출.
      gen,
      isComplete,
    );

    if (!isComplete(script)) {
      return NextResponse.json(
        {
          error:
            "지금은 오디오 대본을 만들지 못했어요(무료 AI 한도). 잠시 후 다시 시도해 주세요.",
        },
        { status: 503 },
      );
    }

    // [끝] 마커는 검증용 — 화면·낭독에는 내보내지 않는다.
    return NextResponse.json({
      script: sanitizeKo(script).replace(/\[끝\]\s*$/, "").trim(),
    });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      {
        error:
          err instanceof AIConfigError
            ? "지금 무료 AI 사용량이 가득 찼어요. 몇 분 뒤 다시 시도해 주세요."
            : err instanceof Error
              ? err.message
              : "알 수 없는 오류",
      },
      { status },
    );
  }
}
