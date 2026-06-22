"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { loadSession, clearSession, Session } from "@/lib/auth";

/** 헤더 우측: 랭킹 링크 + 로그인 상태(이름/로그아웃) */
export default function AuthNav() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setSession(loadSession());
    sync();
    setMounted(true);
    // 로그인/로그아웃(같은 탭) 및 다른 탭 변경 시 헤더 갱신
    window.addEventListener("auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);

  return (
    <div className="flex items-center gap-3 text-sm font-medium">
      <Link href="/leaderboard" className="text-slate-600 hover:text-brand-600">
        🏆 랭킹
      </Link>
      {mounted && session ? (
        <>
          <span className="hidden text-slate-500 sm:inline">
            {session.name}
          </span>
          <button
            onClick={() => {
              clearSession();
              setSession(null);
            }}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          로그인
        </Link>
      )}
    </div>
  );
}
