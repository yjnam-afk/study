"use client";

import { useEffect, useState } from "react";

/**
 * 새 배포 감지 배너.
 * 현재 탭이 받은 빌드 ID(NEXT_PUBLIC_BUILD_ID)와, 라이브 서버의 /api/version 빌드 ID를
 * 주기적으로 비교한다. 다르면 = 새 버전이 배포된 것 → "새로고침" 안내를 띄운다.
 * (브라우저는 Vercel의 '빌드 중' 상태를 직접 알 수 없어, 새 버전이 라이브로 올라온 순간을 잡는다.)
 */
export default function DeployBanner() {
  const mine = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (mine === "dev") return; // 로컬 개발은 무시
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { id?: string };
        if (active && data.id && data.id !== mine) setStale(true);
      } catch {
        // 네트워크 일시 오류는 무시
      }
    };
    check();
    const iv = setInterval(check, 30000); // 30초마다
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [mine]);

  if (!stale) return null;

  return (
    <div className="sticky top-[57px] z-20 border-b border-amber-300 bg-amber-50">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 text-sm text-amber-800">
        <span className="font-semibold">🚀 새 버전이 배포됐어요!</span>
        <span className="hidden sm:inline text-amber-700">
          새로고침하면 최신 기능·데이터가 적용됩니다.
        </span>
        <button
          onClick={() => window.location.reload()}
          className="ml-auto rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-600"
        >
          새로고침
        </button>
      </div>
    </div>
  );
}
