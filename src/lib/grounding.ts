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
  /** 타연관 토픽(쉼표/슬래시 구분 문자열). */
  related?: string;
  /** 교재 분류 경로(예: "보안 > 정책 > 데이터 3법"). */
  classification?: string;
  /** 교재 암기법 원문(여러 두음 줄 포함). 엑셀 '암기법' 컬럼 그대로. */
  memo?: string;
};
const DETAILS = topicDetails as Record<string, Detail>;

/** 서브노트 원본 두음/키워드(있으면 그대로 사용). 제목 자동 매칭 포함. */
export function subnoteFor(opts: { topicId?: string; topicTitle?: string }): {
  mnemonic: string;
  keywords: string[];
  sections: SubnoteSection[];
  related: string[];
  classification: string;
  memo: string;
} {
  const id = opts.topicId || findIdByTitle(opts.topicTitle);
  // 교재 분류: 명시적 classification이 없으면 분야(category) > 그룹(group) > 토픽 으로 자동 구성.
  const t = id
    ? (topics as { id: string; title: string; category?: string; group?: string }[]).find(
        (x) => x.id === id,
      )
    : undefined;
  const autoClassification = t
    ? [t.category, t.group, t.title].filter((s) => s && String(s).trim()).join(" > ")
    : "";
  const d = id ? DETAILS[id] : undefined;
  if (!d)
    return {
      mnemonic: "",
      keywords: [],
      sections: [],
      related: [],
      classification: autoClassification,
      memo: "",
    };
  const keywords = Array.from(
    new Set([
      ...(d.defKeywords || []),
      ...(d.featureKeywords || []),
      ...(d.applicationKeywords || []),
      ...(d.plusKeywords || []),
    ]),
  );
  // 타연관 토픽: 쉼표/슬래시/가운뎃점으로 분리
  const related = (d.related || "")
    .split(/[,/·、]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    mnemonic: (d.mnemonic || "").trim(),
    keywords,
    sections: Array.isArray(d.sections) ? d.sections : [],
    related,
    classification: (d.classification || "").trim() || autoClassification,
    memo: (d.memo || "").trim(),
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
  // 섹션별 두음(라벨·키워드 매핑까지) — 설명의 '시험 포인트'에 반드시 반영되도록 명시.
  if (Array.isArray(d.sections) && d.sections.length) {
    const lines = d.sections
      .filter((s) => s.mnemonic && s.keywords?.length)
      .map((s) => `- [${s.label}] ${s.mnemonic} = ${s.keywords.join("·")}`);
    if (lines.length)
      parts.push(
        `교재 두음신공(★설명·시험포인트에서 이 두음을 그대로 소개하라. 새 두음을 만들지 말 것★):\n${lines.join("\n")}`,
      );
  }
  const cmap = (d.conceptMap || "").trim();
  if (cmap) {
    parts.push(
      `검증된 개념도(★개념도는 아래 구조를 그대로 mermaid로 그려라★):\n${cmap}`,
    );
  }
  return parts.join("\n");
}

/** 토픽에 "검증된 개념도(conceptMap, mermaid)"가 있으면 반환. 설명 페이지가
 *  AI 생성이 아닌 이 데이터를 그대로 그려 항상 정확한 도식을 보여준다. */
export function conceptMapFor(topicId?: string): string {
  if (!topicId) return "";
  const d = DETAILS[topicId];
  return (d?.conceptMap || "").trim();
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

/** 객관식 오답(distractor) 풀. 같은 분야 키워드를 우선(헷갈리게) + 그 외 분야. */
function distractorPool(
  excludeId: string | undefined,
  category: string | undefined,
): { same: string[]; other: string[] } {
  const same: string[] = [];
  const other: string[] = [];
  for (const t of topics as { id: string; category: string }[]) {
    if (t.id === excludeId) continue;
    const ks = DETAILS[t.id]?.featureKeywords;
    if (!ks || !ks.length) continue;
    if (t.category === category) same.push(...ks);
    else other.push(...ks);
  }
  return { same: Array.from(new Set(same)), other: Array.from(new Set(other)) };
}

/**
 * AI 없이 데이터(엑셀 서브노트)만으로 학습세트를 생성.
 *  - 교재 섹션 두음이 큐레이션된 토픽 → 그 섹션을 그대로 사용(최고 품질).
 *  - 섹션이 없어도 정의/특징 키워드가 있으면 그 키워드로 합성(품질은 낮아도 토큰 0·즉시).
 * 키워드가 전혀 없으면 null(→ 호출부가 AI 생성으로 폴백).
 */

/**
 * 교재 원문(detail)·요약(summary)에서 "정의다운 정의" 한 문장을 뽑아 정제한다.
 * (defKeywords를 ·로 잇던 방식은 '관리·SDI'처럼 키워드 나열이라 정의로 안 읽혔음.)
 * - [정의]/[XXX 정의] 마커가 있으면 그 뒤부터
 * - "용어(Eng):" 접두는 제거(제목이 따로 보이므로)
 * - 다음 섹션 마커·구분선에서 자르고, 미완성 꼬리 괄호/접속 제거
 * - 너무 길면(≤150자) 마지막 문장부호에서 마무리
 */
function cleanOne(src?: string): string {
  let s = String(src || "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  const marker = s.match(/\[[^\]]*정의\s*\]\s*(.+)/);
  if (marker) s = marker[1].trim();
  // 다음 섹션(대괄호 라벨)·구분선·유형/종류 목록 시작점에서 절단.
  s = s
    .split(
      /\s*(?:\[[^\]]{1,24}\]|\(목적\)|\(특징\)|-{3,}|▶|- ?유형|- ?종류|- ?구성|·\s?유형)/,
    )[0]
    .trim();
  // 선두 "용어:" / "용어(Eng):" 접두 제거(콜론이 앞 45자 이내일 때만).
  s = s.replace(/^[^:：]{1,45}[:：]\s+/, "").trim();
  // 미완성 꼬리(닫히지 않은 괄호, cf./참고 주석) 제거.
  s = s.replace(/\s*\((?:cf|참고)[^)]*\)?\s*$/i, "").trim();
  s = s.replace(/\s*\([^)]*$/, "").trim();
  s = s.replace(/[\s\-–;,·]+$/, "").trim();
  if (s.length > 150) {
    const cut = s.slice(0, 150);
    const dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("다. "));
    s = (dot > 60 ? cut.slice(0, dot + 1) : cut).replace(/[\s\-–;,·]+$/, "").trim();
  }
  return s;
}
// 조사로 끝나면(문장이 잘렸을 가능성) 불완전으로 본다.
const looksIncomplete = (s: string) =>
  !s || s.length < 16 || /[을를이가은는와과의로도만]$/.test(s);
/**
 * 교재 원문(detail)·요약(summary)에서 "정의다운 정의" 한 문장을 뽑는다.
 * detail 우선, 그 결과가 불완전(짧거나 조사로 끝남)하고 summary가 더 나으면 summary.
 */
export function cleanDefinition(detail?: string, summary?: string): string {
  const fromDetail = cleanOne(detail);
  if (!looksIncomplete(fromDetail)) return fromDetail;
  const fromSummary = cleanOne(summary);
  if (!looksIncomplete(fromSummary)) return fromSummary;
  return fromDetail || fromSummary;
}

export function mnemonicFromData(topicId?: string): DataMnemonicSet | null {
  if (!topicId) return null;
  const d = DETAILS[topicId];
  const t = (topics as { id: string; title: string; summary?: string }[]).find(
    (x) => x.id === topicId,
  );
  if (!d || !t) return null;

  const curated = Array.isArray(d.sections) ? d.sections : [];
  const defKw = (d.defKeywords || []).filter(Boolean);
  const featKw = (d.featureKeywords || []).filter(Boolean);
  const appKw = (d.applicationKeywords || []).filter(Boolean);

  // 본론 섹션 결정: 큐레이션 섹션이 있으면 그대로, 없으면 키워드로 합성.
  let sections: SubnoteSection[];
  if (curated.length) {
    sections = curated;
  } else {
    sections = [];
    const bodyKw = (featKw.length ? featKw : appKw).slice(0, 8);
    if (bodyKw.length) {
      sections.push({
        label: "핵심 키워드",
        mnemonic: bodyKw.map(firstCh).join(""),
        keywords: bodyKw,
      });
    }
    // 특징과 활용이 둘 다 있으면 활용을 별도 그룹으로(서론·본론이 같아지지 않게).
    if (featKw.length && appKw.length) {
      const ak = appKw.slice(0, 6);
      sections.push({
        label: "활용·적용",
        mnemonic: ak.map(firstCh).join(""),
        keywords: ak,
      });
    }
  }

  // 서론(정의) 키워드: 정의 키워드 우선, 없으면 본론 키워드로라도 채운다.
  const introKw = (defKw.length ? defKw : sections[0]?.keywords || []).slice(
    0,
    5,
  );
  // 데이터가 전혀 없으면(키워드·섹션 모두 비었으면) AI로 폴백.
  if (introKw.length === 0 && sections.length === 0) return null;

  // 서론 정의: 교재 원문(detail)·요약(summary)에서 "정의다운 정의" 한 문장을 뽑는다.
  // (예전엔 defKeywords를 ·로 이어 '관리·SDI'처럼 나와 정의로 안 읽혔다.)
  // detail/summary가 모두 없거나 너무 짧으면 정의 키워드 나열로 폴백.
  const defSentence = cleanDefinition(d.detail, t.summary);
  const defLine =
    defSentence && defSentence.length >= 12
      ? defSentence
      : defKw.length
        ? defKw.slice(0, 6).join(" · ")
        : (t.summary || "").split(/[.!?。\n]/)[0].trim().slice(0, 60);

  const intro: DGroup = {
    items: toItems(introKw),
    mnemonic: introKw.map(firstCh).join(""),
    mnemonicHow: "정의 키워드의 첫 글자를 모았어요.",
    definition: defLine,
    features: (featKw.length ? featKw : appKw).slice(0, 3),
  };

  // 본론 그룹: 섹션이 있으면 첫 섹션, 없으면 정의 키워드로라도 구성.
  const first: SubnoteSection = sections[0] || {
    label: "핵심 키워드",
    mnemonic: introKw.map(firstCh).join(""),
    keywords: introKw,
  };
  const body: DGroup = {
    items: toItems(first.keywords),
    mnemonic: first.mnemonic || first.keywords.map(firstCh).join(""),
    mnemonicHow: curated.length ? `${first.label}의 두음` : "핵심 키워드의 두음",
  };

  // 객관식: 같은 분야의 헷갈리는 오답을 쓰고, 가능하면 "해당하지 않는 것은?"(전부 알아야 푸는) 형태로.
  const cat = (
    topics as { id: string; category?: string }[]
  ).find((x) => x.id === topicId)?.category;
  const pool = distractorPool(topicId, cat);
  const ownSet = new Set(sections.flatMap((s) => s.keywords));
  // 결정적으로 오답 후보를 뽑는다(같은 분야 우선 → 그 외). 난수 미사용(캐시 일관성).
  const pickDistractor = (
    salt: number,
    used: Set<string>,
  ): string | null => {
    for (const bucket of [pool.same, pool.other]) {
      for (let j = 0; j < bucket.length; j++) {
        const cand = bucket[(salt * 13 + j * 7 + 5) % bucket.length];
        if (!ownSet.has(cand) && !used.has(cand)) return cand;
      }
    }
    return null;
  };
  const mc: DataMnemonicSet["mc"] = [];
  for (let i = 0; i < sections.length && mc.length < 4; i++) {
    const s = sections[i];
    const used = new Set<string>();
    if (s.keywords.length >= 3) {
      // "해당하지 않는 것은?" — 정답(=오답 키워드) 1 + 진짜 구성요소 3
      const d = pickDistractor(i + 1, used);
      if (!d) continue;
      const reals = s.keywords.slice(0, 3);
      const options = [...reals, d];
      const pos = (i * 3 + 1) % 4;
      [options[options.length - 1], options[pos]] = [
        options[pos],
        options[options.length - 1],
      ];
      mc.push({
        question: `다음 중 '${t.title}'의 [${s.label}](두음 ${s.mnemonic}) 구성요소가 "아닌" 것은?`,
        options,
        answer: options.indexOf(d),
        explanation: `'${d}'은(는) 이 토픽 항목이 아닙니다. ${s.label}: ${s.keywords.join(", ")}`,
      });
    } else {
      // 항목이 적으면 "해당하는 것은?" — 정답 1 + 헷갈리는 오답 3
      const correct = s.keywords[0];
      const distractors: string[] = [];
      for (let k = 0; k < 6 && distractors.length < 3; k++) {
        const d = pickDistractor(i * 10 + k, used);
        if (!d) break;
        used.add(d);
        distractors.push(d);
      }
      if (distractors.length < 3) continue;
      const options = [correct, ...distractors];
      const pos = (i + 1) % 4;
      [options[0], options[pos]] = [options[pos], options[0]];
      mc.push({
        question: `'${t.title}'의 [${s.label}](두음 ${s.mnemonic})에 해당하는 것은?`,
        options,
        answer: options.indexOf(correct),
        explanation: `${s.label}: ${s.keywords.join(", ")}`,
      });
    }
  }

  const recall = {
    prompt: `[${first.label}] 두음 '${first.mnemonic}'이 의미하는 키워드를 모두 쓰시오.`,
    answers: first.keywords,
  };

  return { topic: t.title, intro, body, mc, recall, fromData: true };
}
