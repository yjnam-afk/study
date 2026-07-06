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
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
        {/* 악마 꼬리 */}
        <path
          d="M50 45 C60 46 60 55 54 56 C58 52 55 49 50 49 Z"
          fill="#241a2b"
        />
        {/* 두건(검은 카울) — 얼굴을 감싸는 형태 */}
        <path
          d="M32 6 C17 6 9 17 9 32 C9 45 18 53 32 53 C46 53 55 45 55 32 C55 17 47 6 32 6 Z"
          fill="#241a2b"
        />
        {/* 두건 꼭지(플롭) */}
        <path d="M28 8 C22 -1 12 3 17 11 C21 8 25 8 29 10 Z" fill="#241a2b" />
        <circle cx="15" cy="5.5" r="3" fill="#241a2b" />
        {/* 얼굴(흰색) — 아래쪽에 배치해 두건이 위·옆을 감싸게 */}
        <ellipse cx="32" cy="38" rx="15.5" ry="14" fill="#fbf7fa" />
        {/* 핑크 해골(이마) — 쿠로미 시그니처 */}
        <ellipse cx="32" cy="20" rx="6" ry="5.2" fill="#f4a9cf" />
        <ellipse cx="29.6" cy="19.5" rx="1.5" ry="1.9" fill="#3a2a33" />
        <ellipse cx="34.4" cy="19.5" rx="1.5" ry="1.9" fill="#3a2a33" />
        <path
          d="M30 23.4 H34 M31 23.4 V25.4 M33 23.4 V25.4"
          stroke="#3a2a33"
          strokeWidth="0.9"
        />
        {/* 눈 + 하이라이트 */}
        <ellipse cx="26" cy="37" rx="2.3" ry="3.2" fill="#2a2030" />
        <ellipse cx="38" cy="37" rx="2.3" ry="3.2" fill="#2a2030" />
        <circle cx="26.8" cy="35.8" r="0.7" fill="#ffffff" />
        <circle cx="38.8" cy="35.8" r="0.7" fill="#ffffff" />
        {/* 볼터치 */}
        <circle cx="21.5" cy="42" r="2.4" fill="#f7b8d8" opacity="0.85" />
        <circle cx="42.5" cy="42" r="2.4" fill="#f7b8d8" opacity="0.85" />
        {/* 씩 웃는 입 + 송곳니 */}
        <path
          d="M29 43 Q32 46.5 35 43"
          stroke="#2a2030"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M31.2 44.2 L32.5 47 L33.8 44.2 Z" fill="#fbf7fa" />
      </svg>
    </div>
  );
}
