"use client";

import { useEffect, useRef } from "react";

/**
 * 말랑말랑 커서 효과 — 마우스를 부드럽게 따라오는 파스텔 핑크 글로우.
 * - 마우스가 있는 환경에서만(터치 기기·모션 최소화 설정은 비활성).
 * - pointer-events:none 이라 클릭·스크롤을 방해하지 않음.
 * - requestAnimationFrame + lerp(선형보간)로 "말랑하게" 지연 추적.
 */
export default function CursorTrail() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 터치 기기·모션 최소화 선호 시 효과 끔.
    const noHover = window.matchMedia("(hover: none)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (noHover || reduce) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // 시작 위치(화면 중앙) — Date.now()/Math.random() 미사용.
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let dx = mx,
      dy = my; // 점(빠른 추적)
    let rx = mx,
      ry = my; // 링(느린 추적)
    let raf = 0;
    let visible = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    };
    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    const onDown = () => ring.classList.add("cursor-trail--press");
    const onUp = () => ring.classList.remove("cursor-trail--press");

    const tick = () => {
      // lerp: 목표점으로 조금씩 다가감(값이 작을수록 더 말랑·느긋).
      dx += (mx - dx) * 0.28;
      dy += (my - dy) * 0.28;
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-trail cursor-trail--ring"
        style={{ opacity: 0 }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="cursor-trail cursor-trail--dot"
        style={{ opacity: 0 }}
      />
    </>
  );
}
