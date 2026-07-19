import { NextRequest, NextResponse } from "next/server";
import { generateText, AIConfigError } from "@/lib/ai";
import { explainPrompt, TUTOR_SYSTEM } from "@/lib/prompts";
import { buildGrounding, conceptMapFor } from "@/lib/grounding";
import { cached, hashKey } from "@/lib/cache";
import { sanitizeKo } from "@/lib/sanitize";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { topic, level, topicId } = (await req.json()) as {
      topic: string;
      level?: string;
      topicId?: string;
    };

    if (!topic?.trim()) {
      return NextResponse.json({ error: "토픽을 입력하세요." }, { status: 400 });
    }

    const lv = level || "수험생";
    // 우리 토픽 데이터(서브노트)를 근거로 설명 → ACID 등 교재 핵심이 빠지지 않게.
    const grounding = buildGrounding({ topicId, topicTitle: topic });

    // "완성된 설명"인지 검사: 한도 초과 시 약한 모델이 첫 섹션(한 줄 요약)만 내고
    // 잘리는 경우가 있어, 섹션 헤더 수·길이로 완성도를 본다. 불완전하면 캐시 금지.
    const isComplete = (t: string): boolean => {
      if (!t) return false;
      const headers = (t.match(/^##\s/gm) || []).length;
      // [끝] 마커가 없으면 밑이 잘린 출력 → 캐시 금지·재시도.
      return t.length >= 400 && headers >= 4 && /\[끝\]\s*$/.test(t.trim());
    };

    const gen = () =>
      generateText({
        system: TUTOR_SYSTEM,
        user: explainPrompt(topic, lv, grounding),
        temperature: 0.5,
        valid: isComplete, // 잘린 출력이면 다음 제공자로 폴백
      });

    const text = await cached(
      `explain:v11:${topic}:${lv}:${grounding ? hashKey(grounding) : "-"}`,
      60 * 86400,
      // generateText가 이미 내부에서 제공자 체인을 순회하며 valid(isComplete)
      // 검증·폴백을 한다. 여기서 gen()을 또 감싸 재시도하면 최악의 경우 시간이
      // 배로 늘어 60초(maxDuration)를 넘겨 504가 났다 → 단일 호출로 단축.
      gen,
      isComplete, // 완성본만 캐시에 저장/사용 → 잘린 결과가 박히지 않게
    );

    // 끝내 불완전하면(현재 무료 AI 한도 소진 등) 오해를 주는 한 줄짜리 대신 정직한 안내.
    if (!isComplete(text)) {
      return NextResponse.json(
        {
          error:
            "지금은 설명을 끝까지 생성하지 못했어요(무료 AI 한도). 잠시 후 다시 시도해 주세요. 두음신공·기출 메뉴는 토큰 없이 바로 보실 수 있어요.",
        },
        { status: 503 },
      );
    }

    // [끝] 마커는 검증용 — 화면에는 내보내지 않는다.
    // 검증된 개념도(conceptMap)가 있으면 함께 반환 → 설명 상단에 항상 정확히 렌더.
    return NextResponse.json({
      explanation: sanitizeKo(text).replace(/\[끝\]\s*$/, "").trim(),
      conceptMap: conceptMapFor(topicId),
    });
  } catch (err) {
    const status = err instanceof AIConfigError ? 503 : 500;
    return NextResponse.json(
      {
        error:
          err instanceof AIConfigError
            ? "지금 무료 AI 사용량이 가득 찼어요(하루·분당 한도). 몇 분 뒤 다시 시도하거나, 기출 메뉴의 '클로드 모범답안'을 이용해 주세요."
            : err instanceof Error
              ? err.message
              : "알 수 없는 오류",
      },
      { status },
    );
  }
}
