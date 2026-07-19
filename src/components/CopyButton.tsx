"use client";

import { useState } from "react";

/** 텍스트를 클립보드로 복사하는 작은 버튼. 복사되면 잠깐 '✓ 복사됨' 표시. */
export default function CopyButton({
  text,
  label = "복사",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // 폴백(구형·비보안 컨텍스트): 임시 textarea + execCommand
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* 복사 실패는 조용히 무시 */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        className ||
        "rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
      }
    >
      {done ? "✓ 복사됨" : `📋 ${label}`}
    </button>
  );
}
