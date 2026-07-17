/**
 * flashcards.json 생성기 — 지하철 모드 카드 데이터.
 *
 * topics.json + topicDetails.json(원본)에서 매 빌드 시 새로 추출한다.
 * (과거처럼 수동 스냅샷을 커밋해두면 데이터 정비가 카드에 반영되지 않는
 * 사고가 나므로, package.json prebuild로 항상 자동 재생성한다.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const topics = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/topics.json"), "utf8"),
);
const details = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/topicDetails.json"), "utf8"),
);

const firstCh = (s) => (s || "").trim().charAt(0);

// 교재 원문(detail)·요약(summary)에서 "정의다운 정의" 한 문장 추출.
// (grounding.ts의 cleanDefinition과 동일 규칙 — 지하철 모드/두음신공 정의 일치.)
function cleanOne(src) {
  let s = String(src || "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const marker = s.match(/\[[^\]]*정의\s*\]\s*(.+)/);
  if (marker) s = marker[1].trim();
  s = s
    .split(
      /\s*(?:\[[^\]]{1,24}\]|\(목적\)|\(특징\)|-{3,}|▶|- ?유형|- ?종류|- ?구성|·\s?유형)/,
    )[0]
    .trim();
  s = s.replace(/^[^:：]{1,45}[:：]\s+/, "").trim();
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
const looksIncomplete = (s) =>
  !s || s.length < 16 || /[을를이가은는와과의로도만]$/.test(s);
function cleanDefinition(detail, summary) {
  const fromDetail = cleanOne(detail);
  if (!looksIncomplete(fromDetail)) return fromDetail;
  const fromSummary = cleanOne(summary);
  if (!looksIncomplete(fromSummary)) return fromSummary;
  return fromDetail || fromSummary;
}

const cards = [];
for (const t of topics) {
  const d = details[t.id] || {};
  let sections = Array.isArray(d.sections)
    ? d.sections.filter((s) => s?.mnemonic && s.keywords?.length)
    : [];
  // 섹션이 없어도 두음·키워드가 있으면 단일 섹션으로 구성(구버전 호환).
  if (!sections.length) {
    const kws = (d.featureKeywords || []).filter(Boolean);
    const stored = (d.mnemonic || "").replace(/\s/g, "");
    if (kws.length >= 2) {
      const mnem =
        stored && [...stored].length === kws.length
          ? stored
          : kws.map(firstCh).join("");
      sections = [{ label: "핵심 키워드", mnemonic: mnem, keywords: kws }];
    } else if (stored) {
      sections = [{ label: "두음", mnemonic: stored, keywords: [] }];
    }
  }
  if (!sections.length) continue; // 외울 두음이 없는 토픽은 카드 제외

  cards.push({
    id: t.id,
    title: t.title,
    category: t.category,
    importance: t.importance,
    definition: cleanDefinition(d.detail, t.summary) || t.summary || "",
    sections,
    // 구버전 필드(다른 소비처 호환): 첫 섹션 기준.
    mnemonic: sections[0].mnemonic,
    keywords: sections[0].keywords,
  });
}

const out = path.join(root, "src/data/flashcards.json");
fs.writeFileSync(out, JSON.stringify(cards, null, 1), "utf8");

// 빌드 ID 고정: 한 번만 생성해 파일에 기록 → next.config가 클라이언트·서버 컴파일에서
// 동일 값을 읽는다(배포 감지 오탐/자동 새로고침 오작동 방지). Vercel은 커밋 SHA 우선.
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());
fs.writeFileSync(path.join(root, ".build-id"), buildId, "utf8");
console.log(
  `flashcards.json: ${cards.length}장 (섹션 ${cards.reduce((n, c) => n + c.sections.length, 0)}개, ${(fs.statSync(out).size / 1024).toFixed(0)}KB)`,
);
