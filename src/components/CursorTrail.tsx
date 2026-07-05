"use client";

import { useEffect, useRef } from "react";

/**
 * 말랑말랑 귀여운 커서 효과 — 🍡 경단이 마우스를 부드럽게 따라오고,
 * 움직일 때마다 하트·반짝이가 뿅뿅 흩날린다.
 * - 마우스 환경에서만(터치·모션최소화는 비활성), pointer-events:none.
 * - lerp 지연 추적 + 속도에 따라 살짝 기울고, 클릭하면 말랑 눌림(squish).
 */
const SPARKLES = ["💕", "✨", "🩷", "🫧", "⭐", "🍬"];

export default function CursorTrail() {
  const buddyRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const noHover = window.matchMedia("(hover: none)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (noHover || reduce) return;

    const buddy = buddyRef.current;
    const layer = layerRef.current;
    if (!buddy || !layer) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let x = mx,
      y = my,
      px = mx; // 이전 x — 속도(기울기)용
    let raf = 0;
    let visible = false;
    let sinceSpark = 0;
    let squish = 0; // 클릭 시 1 → 서서히 0

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        buddy.style.opacity = "1";
      }
    };
    const onLeave = () => {
      visible = false;
      buddy.style.opacity = "0";
    };
    const onDown = () => {
      squish = 1;
      burst(3);
    };

    // 반짝이 한 조각 생성(위로 둥실 떠오르며 사라짐).
    const spawn = (cx: number, cy: number) => {
      const s = document.createElement("span");
      s.className = "cursor-spark";
      s.textContent = SPARKLES[Math.floor(Math.random() * SPARKLES.length)];
      const dx = (Math.random() - 0.5) * 44;
      const dy = -22 - Math.random() * 30;
      const rot = (Math.random() - 0.5) * 60;
      s.style.setProperty("--dx", `${dx}px`);
      s.style.setProperty("--dy", `${dy}px`);
      s.style.setProperty("--rot", `${rot}deg`);
      s.style.left = `${cx}px`;
      s.style.top = `${cy}px`;
      s.style.fontSize = `${11 + Math.random() * 8}px`;
      layer.appendChild(s);
      window.setTimeout(() => s.remove(), 750);
    };
    const burst = (n: number) => {
      for (let i = 0; i < n; i++) spawn(mx, my);
    };

    const tick = () => {
      // 말랑 지연 추적.
      x += (mx - x) * 0.2;
      y += (my - y) * 0.2;
      const vx = x - px;
      px = x;
      const speed = Math.hypot(mx - x, my - y);

      // 이동 중이면 일정 간격으로 반짝이 흩뿌리기.
      sinceSpark++;
      if (visible && speed > 6 && sinceSpark > 4) {
        spawn(x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 12);
        sinceSpark = 0;
      }

      squish *= 0.85; // 눌림 서서히 복원
      const tilt = Math.max(-22, Math.min(22, vx * 1.6));
      const sy = 1 - squish * 0.35;
      const sx = 1 + squish * 0.3;
      buddy.style.transform =
        `translate(${x}px, ${y}px) translate(-50%, -50%) ` +
        `rotate(${tilt}deg) scale(${sx}, ${sy})`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("mousedown", onDown);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  return (
    <>
      <div ref={layerRef} aria-hidden className="cursor-spark-layer" />
      <div
        ref={buddyRef}
        aria-hidden
        className="cursor-buddy"
        style={{ opacity: 0 }}
      >
        🍡
      </div>
    </>
  );
}
