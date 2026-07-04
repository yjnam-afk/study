/**
 * fetch 응답을 안전하게 JSON으로 읽는다.
 *
 * 서버리스 함수가 타임아웃(504)/크래시하면 Vercel이 JSON이 아닌 텍스트
 * ("An error occurred with your deployment ...")를 반환한다. 이때 res.json()은
 * "Unexpected token 'A'" 같은 파싱 오류를 던져 사용자에게 흉하게 노출된다.
 * 이 함수는 본문을 텍스트로 먼저 읽고, JSON이 아니면 상황에 맞는 친절한
 * 한국어 메시지를 담은 객체를 돌려준다(에러를 삼키지 않고 error 필드로 전달).
 */
export async function readJsonSafe(
  res: Response,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const raw = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: raw ? JSON.parse(raw) : {} };
  } catch {
    // 비(非)JSON 응답 → 플랫폼 레벨 오류(주로 타임아웃/크래시).
    const timeout = res.status === 504 || /timeout|timed out/i.test(raw);
    const friendly = timeout
      ? "AI 응답이 시간 안에 끝나지 못했어요(무료 제공자 지연). 잠시 후 다시 시도하거나, 두음신공·기출 메뉴를 이용해 주세요."
      : "지금 서버가 잠깐 불안정해요. 잠시 후 다시 시도해 주세요.";
    return { ok: false, status: res.status || 500, data: { error: friendly } };
  }
}
