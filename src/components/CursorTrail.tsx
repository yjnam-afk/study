"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 커서 버디 — /public/cursor-buddy.png(또는 .svg) 이미지가 마우스를 멀찌감치 쫓아온다.
 * 파일이 없으면(404) 조용히 사라진다(아무것도 안 보임). 파일만 넣으면 자동 작동.
 * 이미지 경로는 NEXT_PUBLIC_CURSOR_IMG 로 바꿀 수 있음(기본 /cursor-buddy.png).
 */
const IMG_SRC = process.env.NEXT_PUBLIC_CURSOR_IMG || "/cursor-buddy.png";

export default function CursorTrail() {
  const ref = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState(true); // 이미지 로드 성공 여부

  useEffect(() => {
    const noHover = window.matchMedia("(hover: none)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (noHover || reduce) return;
    const el = ref.current;
    if (!el) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let x = mx,
      y = my;
    let raf = 0;
    let visible = false;
    const GAP = 70; // 커서와 유지할 거리(멀찌감치)

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        el.style.opacity = "1";
      }
    };
    const onLeave = () => {
      visible = false;
      el.style.opacity = "0";
    };
    const tick = () => {
      const dx = mx - x;
      const dy = my - y;
      const dist = Math.hypot(dx, dy) || 1;
      const tx = dist > GAP ? mx - (dx / dist) * GAP : x;
      const ty = dist > GAP ? my - (dy / dist) * GAP : y;
      const prev = x;
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      const face = x < prev ? -1 : 1; // 진행 방향 바라보기
      const bob = Math.sin(x * 0.05) * 3;
      el.style.transform = `translate(${x}px, ${y + bob}px) translate(-50%, -50%) scaleX(${face})`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  if (!ok) return null;

  return (
    <div ref={ref} aria-hidden className="cursor-buddy-img" style={{ opacity: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={IMG_SRC}
        alt=""
        width={56}
        height={56}
        onError={() => setOk(false)}
        draggable={false}
      />
    </div>
  );
}
