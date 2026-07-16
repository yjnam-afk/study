"use client";

import { useEffect } from "react";

/**
 * 루트(레이아웃) 수준 에러 바운더리. 청크 로드 에러는 조용히 새로고침해 복구한다.
 * global-error는 자체 <html>/<body>를 렌더해야 한다(레이아웃을 대체하므로).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunk =
    /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Failed to fetch/i.test(
      `${error?.name} ${error?.message}`,
    );

  useEffect(() => {
    if (isChunk) {
      const key = "chunk-reload-at";
      const last = Number(sessionStorage.getItem(key) || "0");
      const now = Date.now();
      if (now - last > 10000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
      }
    }
  }, [isChunk]);

  return (
    <html lang="ko">
      <body style={{ fontFamily: "sans-serif", textAlign: "center", padding: "64px 16px" }}>
        {!isChunk && (
          <>
            <div style={{ fontSize: 40 }}>📘</div>
            <h2 style={{ marginTop: 12, fontSize: 18, fontWeight: 700 }}>
              앗, 잠깐 문제가 생겼어요
            </h2>
            <p style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
              일시적인 오류예요. 다시 시도하면 대부분 해결됩니다.
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: 20,
                borderRadius: 12,
                background: "#db2777",
                color: "#fff",
                fontWeight: 700,
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
          </>
        )}
      </body>
    </html>
  );
}
