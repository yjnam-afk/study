"use client";

import { useEffect, useRef, useState } from "react";

let seq = 0;

/** ```mermaid 코드블록을 실제 다이어그램(SVG)으로 렌더링. 실패 시 원문 표시. */
export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          // 한글이 깨지지 않도록 페이지 폰트를 그대로 사용
          fontFamily:
            "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        });
        const id = `mmd-${seq++}`;
        const { svg } = await mermaid.render(id, chart);
        if (active && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [chart]);

  if (failed) {
    return (
      <pre className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
        {chart}
      </pre>
    );
  }
  return <div ref={ref} className="my-4 flex justify-center overflow-x-auto" />;
}
