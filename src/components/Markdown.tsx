"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * AI가 내는 마크다운 표는 자주 깨진다(표 앞 빈 줄 누락, |---| 구분행 누락).
 * 렌더 전에 구조를 복구해 어떤 페이지에서든 표가 표로 보이게 한다.
 */
function repairTables(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  const isRow = (s: string) => /^\s*\|.+\|\s*$/.test(s);
  const isSep = (s: string) => /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(s);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (isRow(l)) {
      const prev = out.length ? out[out.length - 1] : "";
      const tableStart = !isRow(prev);
      // 표 시작 앞에는 빈 줄이 있어야 GFM이 표로 인식한다.
      if (tableStart && prev.trim() !== "") out.push("");
      // 헤더 다음 줄이 구분행이 아니면 구분행을 삽입한다.
      if (tableStart && !isSep(lines[i + 1] ?? "")) {
        const cols = l.split("|").length - 2;
        if (cols >= 2) {
          out.push(l);
          out.push("|" + Array(cols).fill(" --- ").join("|") + "|");
          continue;
        }
      }
    }
    out.push(l);
  }
  return out.join("\n");
}

/** AI 답안/설명을 표·목록 포함 마크다운으로 렌더링합니다(mermaid 도식은 렌더하지 않음). */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-answer max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children } = props;
            // mermaid 등 다이어그램 코드블록은 화면에 그리지 않는다(사용자 요청).
            if (/language-mermaid/.test(className || "")) return null;
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {repairTables(children)}
      </ReactMarkdown>
    </div>
  );
}
