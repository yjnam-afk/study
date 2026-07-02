/**
 * 약한(무료) AI 모델이 한국어 단어를 다른 언어(주로 베트남어)로 잘못 출력하는
 * 글리치를 교정한다. 예: '결정' → 'quyết định' / 'quyết정'.
 * 캐시된 결과도 "출력 시점"에 정리하므로 재생성 없이 즉시 고쳐진다.
 */
export function sanitizeKo(t: string): string {
  if (!t) return t;
  return t
    .replace(/quyết\s*định/gi, "결정")
    .replace(/quyết\s*정/gi, "결정")
    .replace(/\bquyết\b/gi, "결정")
    .replace(/quyết/gi, "결정");
}
