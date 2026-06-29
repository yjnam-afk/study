/**
 * 서버 전용: 토픽의 저장된 실데이터(엑셀 서브노트)를 LLM 생성의 "정답 근거"로 만든다.
 * 큰 JSON을 import 하므로 API 라우트(서버)에서만 사용한다(클라이언트 번들 금지).
 */
import topics from "@/data/topics.json";
import topicDetails from "@/data/topicDetails.json";

export type SubnoteSection = {
  label: string;
  mnemonic: string;
  keywords: string[];
};
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
  /** 교재 원본의 섹션별 두음(특징·기술요소·분류 등 각각 별도 두음). */
  sections?: SubnoteSection[];
};
const DETAILS = topicDetails as Record<string, Detail>;

/** 서브노트 원본 두음/키워드(있으면 그대로 사용). 제목 자동 매칭 포함. */
export function subnoteFor(opts: { topicId?: string; topicTitle?: string }): {
  mnemonic: string;
  keywords: string[];
  sections: SubnoteSection[];
} {
  const id = opts.topicId || findIdByTitle(opts.topicTitle);
  const d = id ? DETAILS[id] : undefined;
  if (!d) return { mnemonic: "", keywords: [], sections: [] };
  const keywords = Array.from(
    new Set([
      ...(d.defKeywords || []),
      ...(d.featureKeywords || []),
      ...(d.applicationKeywords || []),
      ...(d.plusKeywords || []),
    ]),
  );
  return {
    mnemonic: (d.mnemonic || "").trim(),
    keywords,
    sections: Array.isArray(d.sections) ? d.sections : [],
  };
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

// ── 데이터-우선 두음신공 (AI 토큰 0) ───────────────────────────────────
// 교재 섹션 두음이 완비된 토픽은 AI 없이 데이터만으로 학습세트를 만든다.

type DItem = { term: string; initial: string; desc: string };
type DGroup = {
  items: DItem[];
  mnemonic: string;
  mnemonicHow: string;
  definition?: string;
  features?: string[];
};
export type DataMnemonicSet = {
  topic: string;
  intro: DGroup;
  body: DGroup;
  mc: {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
  recall: { prompt: string; answers: string[] };
  /** 데이터로 만들었음을 표시(AI 미사용). */
  fromData: true;
};

const firstCh = (s: string) => (s || "").trim().charAt(0);
const toItems = (kws: string[]): DItem[] =>
  kws.map((k) => ({ term: k, initial: firstCh(k), desc: "" }));

/** 다른 토픽 키워드를 모아 객관식 오답(distractor) 풀을 만든다. */
function distractorPool(excludeId?: string): string[] {
  const pool: string[] = [];
  for (const t of topics as { id: string }[]) {
    if (t.id === excludeId) continue;
    const e = DETAILS[t.id];
    const ks = e?.featureKeywords;
    if (ks && ks.length) pool.push(...ks);
    if (pool.length > 400) break;
  }
  return Array.from(new Set(pool));
}

/**
 * 교재에 섹션 두음이 있는 토픽이면 AI 없이 데이터로 학습세트를 생성.
 * 데이터가 부족하면 null(→ 호출부가 AI 생성으로 폴백).
 */
export function mnemonicFromData(topicId?: string): DataMnemonicSet | null {
  if (!topicId) return null;
  const d = DETAILS[topicId];
  const t = (topics as { id: string; title: string; summary?: string }[]).find(
    (x) => x.id === topicId,
  );
  if (!d || !t) return null;
  const sections = Array.isArray(d.sections) ? d.sections : [];
  if (sections.length === 0) return null; // 큐레이션된 섹션이 있을 때만 데이터-우선

  const defKw = (d.defKeywords || []).slice(0, 5);
  const intro: DGroup = {
    items: toItems(defKw),
    mnemonic: defKw.map(firstCh).join(""),
    mnemonicHow: "정의 키워드의 첫 글자를 모았어요.",
    definition: t.summary || "",
    features: (d.featureKeywords || []).slice(0, 3),
  };

  const first = sections[0];
  const body: DGroup = {
    items: toItems(first.keywords),
    mnemonic: first.mnemonic || first.keywords.map(firstCh).join(""),
    mnemonicHow: `${first.label}의 두음`,
  };

  // 객관식: 섹션마다 1문제(최대 3). 정답=그 섹션 키워드, 오답=다른 토픽 키워드.
  const pool = distractorPool(topicId);
  const ownSet = new Set(sections.flatMap((s) => s.keywords));
  const mc: DataMnemonicSet["mc"] = [];
  for (let i = 0; i < sections.length && mc.length < 3; i++) {
    const s = sections[i];
    const correct = s.keywords[0];
    const distractors: string[] = [];
    for (let j = 0; j < pool.length && distractors.length < 3; j++) {
      // 인덱스 기반으로 결정적으로 골라 캐시 일관성 유지(난수 미사용)
      const cand = pool[(i * 37 + j * 13 + 7) % pool.length];
      if (!ownSet.has(cand) && !distractors.includes(cand)) distractors.push(cand);
    }
    if (distractors.length < 3) continue;
    const options = [correct, ...distractors];
    // 정답 위치를 섹션 인덱스로 결정적으로 회전
    const pos = i % 4;
    [options[0], options[pos]] = [options[pos], options[0]];
    mc.push({
      question: `'${t.title}'의 [${s.label}](두음 ${s.mnemonic})에 해당하는 것은?`,
      options,
      answer: options.indexOf(correct),
      explanation: `${s.label}: ${s.keywords.join(", ")}`,
    });
  }

  const recall = {
    prompt: `[${first.label}] 두음 '${first.mnemonic}'이 의미하는 키워드를 모두 쓰시오.`,
    answers: first.keywords,
  };

  return { topic: t.title, intro, body, mc, recall, fromData: true };
}
