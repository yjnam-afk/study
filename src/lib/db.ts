/**
 * Upstash Redis(REST) 클라이언트.
 * Vercel Storage(Upstash) 연동 시 자동 주입되는 환경변수를 사용합니다.
 *   - UPSTASH_REDIS_REST_URL
 *   - UPSTASH_REDIS_REST_TOKEN
 * 별도 SDK 없이 REST API 로만 호출하여 의존성을 늘리지 않습니다.
 */

// Vercel 연동 방식에 따라 주입되는 변수 이름이 다를 수 있어 모두 허용합니다.
const URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export class DBConfigError extends Error {}

export function dbConfigured(): boolean {
  return Boolean(URL && TOKEN);
}

/** Redis 명령을 REST 로 실행합니다. 예) redis("SET", "k", "v") */
export async function redis<T = unknown>(
  ...command: (string | number)[]
): Promise<T> {
  if (!URL || !TOKEN) {
    throw new DBConfigError(
      "랭킹 DB가 설정되지 않았습니다. Vercel에 Upstash Redis를 연결하고 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 환경변수를 추가하세요.",
    );
  }
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`DB 오류 (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { result?: T; error?: string };
  if (data.error) throw new Error(`DB 오류: ${data.error}`);
  return data.result as T;
}
