"use client";

import { useState } from "react";

/* 카카오 JS 키(공개 키 — 도메인 제한으로 보호됨). env 우선, 없으면 기본값 사용. */
const KAKAO_KEY =
  process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "01a30e83734c5fea54d11788b1a6c228";

declare global {
  interface Window {
    // 카카오 SDK
    Kakao?: {
      isInitialized?: () => boolean;
      init: (k: string) => void;
      Share?: { sendDefault: (o: unknown) => void };
    };
  }
}

async function ensureKakao() {
  if (!KAKAO_KEY || typeof window === "undefined") return null;
  if (!window.Kakao) {
    await new Promise<void>((resolve) => {
      const s = document.createElement("script");
      s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }
  const K = window.Kakao;
  if (K && !K.isInitialized?.()) {
    try {
      K.init(KAKAO_KEY);
    } catch {
      /* ignore */
    }
  }
  return K?.Share ? K : null;
}

/**
 * 공유 버튼: 카카오톡 + 주소 복사.
 *  - title: 카카오톡 메시지 제목/짧은 본문
 *  - text: 클립보드에 복사할 본문(길어도 됨, 답안 전문 등)
 *  - url:  공유 링크(없으면 현재 페이지)
 */
export default function ShareButton({
  title,
  text,
  url,
  dark = false,
}: {
  title?: string;
  text?: string;
  url?: string;
  dark?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function link() {
    return url || (typeof window !== "undefined" ? window.location.href : "");
  }

  async function copyUrl() {
    const payload = [text, link()].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function shareKakao() {
    const K = await ensureKakao();
    if (K?.Share) {
      try {
        K.Share.sendDefault({
          objectType: "text",
          text: (title ? title + "\n" : "") + "스파르타 소설클럽",
          link: { mobileWebUrl: link(), webUrl: link() },
        });
        return;
      } catch {
        /* fall through */
      }
    }
    // 폴백: 링크 복사 안내
    await copyUrl();
    alert("링크를 복사했어요. 카카오톡 대화창에 붙여넣어 공유하세요.");
  }

  const base = dark
    ? "border-white/40 bg-white/10 text-white hover:bg-white/20"
    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

  return (
    <div className="inline-flex gap-2">
      <button
        onClick={shareKakao}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${base}`}
      >
        💬 카카오톡
      </button>
      <button
        onClick={copyUrl}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${base}`}
      >
        {copied ? "✓ 복사됨" : "📋 주소 복사"}
      </button>
    </div>
  );
}
