"use client";

import { useEffect, useState } from "react";
import Mermaid from "@/components/Mermaid";

/**
 * 개념도 렌더 — "실제 교재 개념도 이미지"를 최우선으로 보여준다.
 *  1) /concept/<topicId>.svg 가 있으면 그걸(벡터라 선명).
 *  2) 없으면 /concept/<topicId>.png.
 *  3) 이미지가 하나도 없으면 mermaid(chart)로 폴백.
 *  4) 둘 다 없으면 아무것도 안 그림.
 *
 * → mermaid 재현이 교재 원본과 다르던 문제 해결: 원본 이미지를 public/concept/ 에
 *   <토픽id>.svg(또는 .png)로 올리기만 하면 그 토픽은 실제 개념도가 뜬다.
 */
const CANDIDATES = (id: string) => [
  `/concept/${id}.svg`,
  `/concept/${id}.png`,
  `/concept/${id}.jpg`,
];

export default function ConceptDiagram({
  topicId,
  chart,
}: {
  topicId?: string;
  chart?: string;
}) {
  const srcs = topicId ? CANDIDATES(topicId) : [];
  const [idx, setIdx] = useState(0); // 시도 중인 이미지 후보 인덱스
  const [imgFailed, setImgFailed] = useState(!topicId); // 이미지 없음 확정

  // 토픽이 바뀌면 이미지 탐색을 처음부터 다시.
  useEffect(() => {
    setIdx(0);
    setImgFailed(!topicId);
  }, [topicId]);

  const hasChart = Boolean(chart && chart.trim());
  // 이미지도 없고(확정) 차트도 없으면 렌더 안 함.
  if (imgFailed && !hasChart) return null;

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 md:p-6">
      <div className="mb-1 text-xs font-semibold text-brand-700">📊 개념도</div>
      {!imgFailed && srcs[idx] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={srcs[idx]}
          alt="개념도"
          className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg bg-white"
          onError={() => {
            // 다음 확장자 후보로, 다 실패하면 mermaid 폴백.
            if (idx < srcs.length - 1) setIdx((i) => i + 1);
            else setImgFailed(true);
          }}
        />
      ) : hasChart ? (
        <Mermaid chart={chart!} />
      ) : null}
    </div>
  );
}
