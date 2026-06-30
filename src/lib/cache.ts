/**
 * AI 생성 결과 캐시(Upstash Redis). 같은 토픽/문제는 한 번만 생성하고
 * 이후에는 캐시에서 바로 돌려준다 → 무료 AI 한도(Groq 등) 소모를 크게 줄인다.
 * DB가 없거나 캐시 오류가 나도 생성은 정상 진행(캐시는 부가 기능).
 */
import { redis, dbConfigured } from "@/lib/db";

const PREFIX = "aicache:v1:";

/** 문자열을 짧고 안정적인 키로 해시(djb2). */
export function hashKey(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** 캐시에 있으면 그대로, 없으면 produce()로 생성 후 저장한다.
 *  valid(선택): 생성 결과가 "완성본"일 때만 true를 반환하도록 주면,
 *  검증을 통과한 결과만 캐시에 저장한다(한도 초과 시 약한 모델이 낸 잘린/빈
 *  결과가 캐시에 박혀 계속 재노출되는 문제 방지). 불완전하면 저장하지 않아
 *  다음 호출 때 자동으로 다시 생성한다. */
export async function cached<T>(
  key: string,
  ttlSec: number,
  produce: () => Promise<T>,
  valid?: (v: T) => boolean,
): Promise<T> {
  const full = PREFIX + key;
  if (dbConfigured()) {
    try {
      const hit = await redis<string | null>("GET", full);
      if (hit) {
        const parsed = JSON.parse(hit) as T;
        // 과거에 저장된 불량(불완전) 캐시는 무시하고 새로 생성한다.
        if (!valid || valid(parsed)) return parsed;
      }
    } catch {
      // 캐시 조회 실패는 무시하고 생성 진행
    }
  }
  const value = await produce();
  if (dbConfigured() && (!valid || valid(value))) {
    try {
      await redis("SET", full, JSON.stringify(value), "EX", ttlSec);
    } catch {
      // 캐시 저장 실패는 무시
    }
  }
  return value;
}
