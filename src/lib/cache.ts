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

/** 캐시에 있으면 그대로, 없으면 produce()로 생성 후 저장한다. */
export async function cached<T>(
  key: string,
  ttlSec: number,
  produce: () => Promise<T>,
): Promise<T> {
  const full = PREFIX + key;
  if (dbConfigured()) {
    try {
      const hit = await redis<string | null>("GET", full);
      if (hit) return JSON.parse(hit) as T;
    } catch {
      // 캐시 조회 실패는 무시하고 생성 진행
    }
  }
  const value = await produce();
  if (dbConfigured()) {
    try {
      await redis("SET", full, JSON.stringify(value), "EX", ttlSec);
    } catch {
      // 캐시 저장 실패는 무시
    }
  }
  return value;
}
