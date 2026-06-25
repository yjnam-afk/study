"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { loadSession } from "@/lib/auth";

/** 로그인하지 않은 사용자는 /login 으로 보냅니다(회원가입/로그인 필수). */
const PUBLIC_PATHS = ["/login"];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const ok = !!loadSession();
    setAuthed(ok);
    setReady(true);
    if (!ok && !PUBLIC_PATHS.includes(pathname)) {
      // 로그인 후 원래 가려던 페이지로 돌아오도록 next 에 현재 경로를 담는다.
      const next = pathname + (window.location.search || "");
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [pathname, router]);

  // 세션 확인 전 또는 비로그인 상태에서 보호 페이지 → 내용 숨김(리다이렉트 중)
  if (!ready) return null;
  if (!authed && !PUBLIC_PATHS.includes(pathname)) return null;
  return <>{children}</>;
}
