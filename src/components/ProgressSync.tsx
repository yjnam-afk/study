"use client";

import { useEffect, useRef, useState } from "react";
import { loadSession, Session } from "@/lib/auth";
import { syncNow, pushLocal } from "@/lib/sync";

/**
 * 로그인 상태에서 학습 진도를 계정별로 서버와 동기화한다(보이지 않는 백그라운드 컴포넌트).
 *  - 진입 시: 서버↔로컬 양방향 병합
 *  - 학습 변경 시: 디바운스 업로드
 *  - 탭이 숨겨질 때: 즉시 업로드
 * 서버(Upstash) 미설정 등 오류는 조용히 무시(로컬 학습은 그대로 동작).
 */
export default function ProgressSync() {
  const [session, setSession] = useState<Session | null>(null);

  // 세션 변화 추적(로그인/로그아웃)
  useEffect(() => {
    setSession(loadSession());
    const onAuth = () => setSession(loadSession());
    window.addEventListener("auth-change", onAuth);
    return () => window.removeEventListener("auth-change", onAuth);
  }, []);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;

    // 진입 시 양방향 동기화
    syncNow(session).catch(() => {});

    const debouncedPush = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (active) pushLocal(session).catch(() => {});
      }, 2500);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        pushLocal(session).catch(() => {});
      }
    };

    window.addEventListener("progress-change", debouncedPush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("progress-change", debouncedPush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [session]);

  return null;
}
