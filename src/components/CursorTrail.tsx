"use client";

import { useEffect, useRef } from "react";

/**
 * 쿠로미풍(자정 보라/검정) 캐릭터가 마우스를 "멀찌감치" 쫓아온다.
 * - 느린 lerp + 최소 간격 유지 → 커서에 딱 붙지 않고 뒤에서 살랑살랑 따라옴.
 * - 이동 방향으로 살짝 바라보고(좌우 반전), 위아래로 둥실.
 * - 터치·모션최소화 환경은 비활성, pointer-events 없음.
 */
export default function CursorTrail() {
  const ref = useRef<HTMLDivElement>(null);

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
    const GAP = 70; // 커서와 유지할 최소 거리(멀찌감치)

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
      // 커서에서 GAP만큼 떨어진 지점을 목표로 → 딱 붙지 않고 뒤에서 따라옴.
      const dx = mx - x;
      const dy = my - y;
      const dist = Math.hypot(dx, dy) || 1;
      const targetX = dist > GAP ? mx - (dx / dist) * GAP : x;
      const targetY = dist > GAP ? my - (dy / dist) * GAP : y;
      const prevX = x;
      x += (targetX - x) * 0.06; // 느긋하게 쫓아옴
      y += (targetY - y) * 0.06;
      const face = x < prevX ? -1 : 1; // 이동 방향 바라보기
      const bob = Math.sin(x * 0.05) * 3; // 살랑살랑
      el.style.transform =
        `translate(${x}px, ${y + bob}px) translate(-50%, -50%) scaleX(${face})`;
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

  return (
    <div ref={ref} aria-hidden className="cursor-kuromi" style={{ opacity: 0 }}>
      <svg width="46" height="46" viewBox="0 0 64 64" fill="none">
        {/* 두건(뒤) */}
        <path
          d="M12 30 C10 12 24 6 32 6 C40 6 54 12 52 30 C54 40 46 50 32 50 C18 50 10 40 12 30 Z"
          fill="#1c1420"
        />
        {/* 뾰족 귀(악마풍) */}
        <path d="M18 16 C14 8 20 6 24 12 C22 15 20 16 18 16 Z" fill="#1c1420" />
        <path d="M46 16 C50 8 44 6 40 12 C42 15 44 16 46 16 Z" fill="#1c1420" />
        <circle cx="20" cy="10" r="2.4" fill="#f5a7d1" />
        <circle cx="44" cy="10" r="2.4" fill="#f5a7d1" />
        {/* 얼굴 */}
        <ellipse cx="32" cy="35" rx="16" ry="14.5" fill="#fbf7fb" />
        {/* 해골 문양(이마) */}
        <ellipse cx="32" cy="21" rx="5" ry="4.4" fill="#fbf7fb" />
        <circle cx="30" cy="20.5" r="1.1" fill="#2a2030" />
        <circle cx="34" cy="20.5" r="1.1" fill="#2a2030" />
        <path d="M30.5 24 L33.5 24 M31.2 24 L31.2 26 M32.8 24 L32.8 26" stroke="#2a2030" strokeWidth="0.8" />
        {/* 눈 */}
        <ellipse cx="25.5" cy="35" rx="2.2" ry="3.1" fill="#2a2030" />
        <ellipse cx="38.5" cy="35" rx="2.2" ry="3.1" fill="#2a2030" />
        {/* 볼터치 */}
        <circle cx="21" cy="40" r="2.6" fill="#f7b8d8" opacity="0.8" />
        <circle cx="43" cy="40" r="2.6" fill="#f7b8d8" opacity="0.8" />
        {/* 씩 웃는 입 + 송곳니 */}
        <path d="M28 42 Q32 46 36 42" stroke="#2a2030" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M31 43 L32.4 46 L33.6 43 Z" fill="#fbf7fb" />
      </svg>
    </div>
  );
}
