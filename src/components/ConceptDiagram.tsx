"use client";

import { useEffect, useState } from "react";

/**
 * 개념도 — "실제 교재 개념도 이미지"만 보여준다(머메이드 사용 안 함).
 *  1) /concept/<topicId>.svg  (벡터, 선명)
 *  2) 없으면 .png → .jpg
 *  3) 이미지가 없으면 아무것도 안 그림(머메이드 폴백 없음).
 *
 * → 원본 이미지를 public/concept/ 에 <토픽id>.svg(또는 .png)로 올리면 그 토픽만 실제 개념도가 뜬다.
 */
const CANDIDATES = (id: string) => [
  `/concept/${id}.svg`,
  `/concept/${id}.png`,
  `/concept/${id}.jpg`,
];

export default function ConceptDiagram({ topicId }: { topicId?: string }) {
  const srcs = topicId ? CANDIDATES(topicId) : [];
  const [idx, setIdx] = useState(0); // 시도 중인 이미지 후보 인덱스
  const [done, setDone] = useState(!topicId); // 이미지 없음 확정(더 이상 시도 안 함)

  // 토픽이 바뀌면 이미지 탐색을 처음부터 다시.
  useEffect(() => {
    setIdx(0);
    setDone(!topicId);
  }, [topicId]);

  // 이미지가 없으면(확정) 개념도 영역 자체를 숨김.
  if (done || !srcs[idx]) return null;

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 md:p-6">
      <div className="mb-1 text-xs font-semibold text-brand-700">📊 개념도</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={srcs[idx]}
        alt="개념도"
        className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg bg-white"
        onError={() => {
          // 다음 확장자 후보로, 다 실패하면 숨김.
          if (idx < srcs.length - 1) setIdx((i) => i + 1);
          else setDone(true);
        }}
      />
    </div>
  );
}
