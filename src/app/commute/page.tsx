"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import cards from "@/data/flashcards.json";
import { loadReview, saveReview, markReviewed, getItem } from "@/lib/storage";

type Card = {
  id: string;
  title: string;
  category: string;
  importance: string;
  definition: string;
  /** 교재 구획별 두음(빌드 시 topicDetails에서 자동 추출). */
  sections: { label: string; mnemonic: string; keywords: string[] }[];
  mnemonic: string;
  keywords: string[];
};

const ALL = cards as Card[];
const CATS = ["전체", ...Array.from(new Set(ALL.map((c) => c.category)))];
const IMP: Record<string, number> = { 상: 0, 중: 1, 출제예상: 2, 하: 3 };

export default function CommutePage() {
  const [cat, setCat] = useState("전체");
  const [sangOnly, setSangOnly] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  const queue = useMemo(() => {
    const list = ALL.filter(
      (c) =>
        (cat === "전체" || c.category === cat) &&
        (!sangOnly || c.importance === "상"),
    )
      .slice()
      .sort((a, b) => (IMP[a.importance] ?? 9) - (IMP[b.importance] ?? 9));
    return list;
    // cat/sangOnly 바뀌면 새 큐
  }, [cat, sangOnly]);

  const card = queue[idx];

  function next(memorized: boolean) {
    if (card && memorized) {
      // 외웠으면 회독 +1 (랭킹·진도 반영)
      const state = loadReview();
      saveReview(markReviewed(state, card.id));
      setDone((d) => d + 1);
    }
    setFlipped(false);
    setIdx((i) => (i + 1) % Math.max(1, queue.length));
  }

  function reset(newCat: string, newSang: boolean) {
    setCat(newCat);
    setSangOnly(newSang);
    setIdx(0);
    setFlipped(false);
  }

  const rounds = card ? getItem(loadReview(), card.id).rounds : 0;

  return (
    <div>
      <PageHeader
        title="🚇 지하철 모드 — 틈새 두음"
        desc="한 손으로 넘기는 두음 암기. AI 없이 즉시 동작하니 통신이 약해도 OK."
      />

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={cat}
          onChange={(e) => reset(e.target.value, sangOnly)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {CATS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => reset(cat, !sangOnly)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
            sangOnly
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-slate-300 bg-white text-slate-600"
          }`}
        >
          ⭐ 중요도 상만
        </button>
        <span className="ml-auto text-xs text-slate-400">
          {queue.length}장 · 외운 {done}장
        </span>
      </div>

      {!card ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          해당 조건의 카드가 없습니다.
        </p>
      ) : (
        <>
          {/* 카드 (탭하면 뒤집기 · 텍스트 드래그 선택 가능) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              // 텍스트를 드래그 선택 중이면 뒤집지 않는다(복사 가능하게).
              if ((window.getSelection()?.toString() || "").trim().length > 0)
                return;
              setFlipped((f) => !f);
            }}
            className="block w-full cursor-pointer select-text rounded-3xl border border-slate-200 bg-white p-8 text-left shadow-sm transition active:scale-[0.99] min-h-[19rem]"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                {card.importance}
              </span>
              <span className="text-xs text-slate-400">{card.category}</span>
              {rounds > 0 && (
                <span className="text-xs text-amber-600">· {rounds}회독</span>
              )}
            </div>
            <h2 className="mt-3 text-2xl font-bold leading-snug text-slate-900">
              {card.title}
            </h2>

            {!flipped ? (
              <p className="mt-8 text-center text-sm text-slate-400">
                👆 탭해서 정의·두음·키워드 확인
              </p>
            ) : (
              <div className="mt-5">
                {card.definition && (
                  <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="text-xs font-semibold text-amber-700">
                      📖 정의
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-800">
                      {card.definition}
                    </p>
                  </div>
                )}
                {/* 교재 구획별 두음 — 두음신공 카드와 동일한 데이터 */}
                {(card.sections || []).map((s, si) => {
                  const letters = [...(s.mnemonic || "").replace(/\s/g, "")];
                  const aligned = letters.length === s.keywords.length;
                  return (
                    <div key={si} className={si > 0 ? "mt-4" : ""}>
                      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-slate-50 p-4 text-center">
                        <div className="text-xs font-medium text-brand-500">
                          {s.label || "두음신공"}
                        </div>
                        <div className="mt-1 text-3xl font-extrabold tracking-wide text-brand-700">
                          {s.mnemonic}
                        </div>
                      </div>
                      {s.keywords.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {s.keywords.map((k, i) => (
                            <li key={i} className="flex items-center gap-3">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-base font-extrabold text-brand-700">
                                {aligned ? letters[i] : i + 1}
                              </span>
                              <span className="text-sm text-slate-800">{k}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 하단 큰 버튼 (한 손 조작) */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => next(false)}
              className="rounded-2xl border border-slate-300 bg-white py-4 text-base font-bold text-slate-600 active:bg-slate-50"
            >
              ↻ 다시
            </button>
            <button
              onClick={() => next(true)}
              className="rounded-2xl bg-amber-600 py-4 text-base font-bold text-white active:bg-amber-700"
            >
              ✓ 외웠어요
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            {idx + 1} / {queue.length} · &ldquo;외웠어요&rdquo;는 회독 +1로
            기록돼 랭킹에 반영돼요.
          </p>
        </>
      )}
    </div>
  );
}
