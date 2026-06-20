"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** AI 답안/설명을 표·목록 포함 마크다운으로 렌더링합니다. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-answer max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
