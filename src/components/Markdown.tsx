"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Mermaid from "./Mermaid";

/** AI 답안/설명을 표·목록·개념도(mermaid) 포함 마크다운으로 렌더링합니다. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-answer max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children } = props;
            const text = String(children ?? "");
            if (/language-mermaid/.test(className || "")) {
              return <Mermaid chart={text.replace(/\n$/, "")} />;
            }
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
