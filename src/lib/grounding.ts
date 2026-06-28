/**
 * 서버 전용: 토픽의 저장된 실데이터(엑셀 서브노트)를 LLM 생성의 "정답 근거"로 만든다.
 * 큰 JSON을 import 하므로 API 라우트(서버)에서만 사용한다(클라이언트 번들 금지).
 */
import topics from "@/data/topics.json";
import topicDetails from "@/data/topicDetails.json";

type Detail = {
  detail?: string;
  defKeywords?: string[];
  featureKeywords?: string[];
  applicationKeywords?: string[];
  plusKeywords?: string[];
  /** 서브노트에 들어있는 원본 두음신공(있으면 LLM 생성보다 우선). */
  mnemonic?: string;
  /** 검증된 관계형 개념도(mermaid). 있으면 이 구조를 그대로 그리도록 지시. */
  conceptMap?: string;
};
const DETAILS = topicDetails as Record<string, Detail>;

/** 서브노트 원본 두음/키워드(있으면 그대로 사용). 제목 자동 매칭 포함. */
export function subnoteFor(opts: { topicId?: string; topicTitle?: string }): {
  mnemonic: string;
  keywords: string[];
} {
  const id = opts.topicId || findIdByTitle(opts.topicTitle);
  const d = id ? DETAILS[id] : undefined;
  if (!d) return { mnemonic: "", keywords: [] };
  const keywords = Array.from(
    new Set([
      ...(d.defKeywords || []),
      ...(d.featureKeywords || []),
      ...(d.applicationKeywords || []),
      ...(d.plusKeywords || []),
    ]),
  );
  return { mnemonic: (d.mnemonic || "").trim(), keywords };
}

/** 제목으로 토픽 id를 찾는다(직접 타이핑해도 데이터 연결되도록). */
export function findIdByTitle(title?: string): string | undefined {
  const t = (title || "").trim();
  if (!t) return undefined;
  return topics.find((x) => x.title === t)?.id;
}

/** 토픽의 저장된 실제 내용을 "원문 그대로" 근거 텍스트로 만든다. */
export function groundingFrom(topicId?: string): string {
  if (!topicId) return "";
  const d = DETAILS[topicId];
  if (!d) return "";
  const parts: string[] = [];
  if (d.detail) parts.push(d.detail.slice(0, 900));
  // 서론(정의)용과 본론(구성요소)용 키워드를 분리해 제시 → 서론·본론이 같아지지 않게
  const def = Array.from(new Set(d.defKeywords || []));
  const feat = Array.from(new Set(d.featureKeywords || []));
  const extra = Array.from(
    new Set([...(d.applicationKeywords || []), ...(d.plusKeywords || [])]),
  );
  if (def.length) parts.push(`정의(서론)용 키워드: ${def.join(", ")}`);
  if (feat.length)
    parts.push(`본론(구성요소·나열 항목)용 키워드: ${feat.join(", ")}`);
  if (extra.length) parts.push(`추가/활용 키워드: ${extra.join(", ")}`);
  const mnem = (d.mnemonic || "").trim();
  if (mnem) {
    parts.push(`서브노트 원본 두음신공(이것을 그대로 사용): ${mnem}`);
  }
  const cmap = (d.conceptMap || "").trim();
  if (cmap) {
    parts.push(
      `검증된 개념도(★개념도는 아래 구조를 그대로 mermaid로 그려라★):\n${cmap}`,
    );
  }
  return parts.join("\n");
}

/** 사용자 붙여넣기 자료 + 토픽 실데이터를 합쳐 최종 근거를 만든다. */
export function buildGrounding(opts: {
  topicId?: string;
  topicTitle?: string;
  reference?: string;
}): string {
  const id = opts.topicId || findIdByTitle(opts.topicTitle);
  return [groundingFrom(id), opts.reference]
    .filter((s) => s && s.trim())
    .join("\n\n");
}
