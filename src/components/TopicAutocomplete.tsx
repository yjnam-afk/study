"use client";

import { useMemo, useState } from "react";
import topics from "@/data/topics.json";

type T = { id: string; title: string; category: string; importance: string };

/**
 * 토픽/키워드 직접 입력 시, 비슷한 토픽을 드롭다운으로 노출해 빠르게 선택.
 * - onChange: 사용자가 직접 타이핑(데이터 연결 해제)
 * - onSelect: 제안을 선택(토픽 id까지 연결 → 교재 근거 사용)
 */
export default function TopicAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (t: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();

  const matches = useMemo(() => {
    if (q.length < 1) return [] as T[];
    const arr = (topics as T[]).filter((t) =>
      t.title.toLowerCase().includes(q),
    );
    // 앞부분 일치 → 짧은 제목 순으로 정렬(가장 가까운 것 위로)
    arr.sort((a, b) => {
      const as = a.title.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = b.title.toLowerCase().startsWith(q) ? 0 : 1;
      return as - bs || a.title.length - b.title.length;
    });
    // 완전 일치(이미 선택된 토픽)면 굳이 목록을 안 띄운다
    if (arr.length === 1 && arr[0].title.toLowerCase() === q) return [];
    return arr.slice(0, 8);
  }, [q]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <li className="px-3 py-1.5 text-[10px] text-slate-400">
            비슷한 토픽 {matches.length}개 — 선택하면 교재 근거로 정확히 생성돼요
          </li>
          {matches.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // blur보다 먼저 실행되도록 mousedown + preventDefault
                  e.preventDefault();
                  onSelect(t);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                  {t.importance}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-800">
                  {t.title}
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {t.category}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
