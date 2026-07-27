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
      const here = link();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const links = { mobileWebUrl: here, webUrl: here };
      // 클릭 가능한 카드(이미지+버튼) 형식
      try {
        K.Share.sendDefault({
          objectType: "feed",
          content: {
            title: title || "한놈도 못 도망가 스파르타",
            description:
              (text && text.slice(0, 80)) ||
              "정보관리기술사 학습 — 두음신공 + 답안쓰기",
            imageUrl: `${origin}/api/og`,
            link: links,
          },
          buttons: [{ title: "앱 열기", link: links }],
        });
        return;
      } catch {
        /* feed 실패 시 텍스트+버튼으로 재시도 */
      }
      try {
        K.Share.sendDefault({
          objectType: "text",
          text: (title ? title + "\n" : "") + "한놈도 못 도망가 스파르타 — 같이 공부해요!",
          link: links,
          buttonTitle: "앱 열기",
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
    <div className="inline-flex flex-wrap gap-2">
      <button
        onClick={copyUrl}
        title="PC·모바일 모두 클릭되는 링크가 복사됩니다"
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${base}`}
      >
        {copied ? "✓ 복사됨! 붙여넣기" : "📋 링크 복사 (PC·모바일)"}
      </button>
      <button
        onClick={shareKakao}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${base}`}
      >
        💬 카카오톡
      </button>
    </div>
  );
}
