"use client";

import { useState } from "react";

/**
 * 공유 버튼. 지원 기기에서는 Web Share API(navigator.share)로 네이티브 공유 시트를,
 * 미지원 환경에서는 클립보드 복사로 폴백한다.
 */
export default function ShareButton({
  title,
  text,
  url,
  label = "공유",
  className = "",
}: {
  title?: string;
  text?: string;
  url?: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const link =
      url || (typeof window !== "undefined" ? window.location.href : "");
    const shareData: ShareData = { title, text, url: link };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // 사용자가 공유 시트를 취소한 경우 등 — 폴백으로 진행하지 않고 종료
      return;
    }
    // 폴백: 클립보드 복사
    try {
      const payload = [text, link].filter(Boolean).join("\n\n");
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
      }
    >
      {copied ? "✓ 복사됨" : `🔗 ${label}`}
    </button>
  );
}
