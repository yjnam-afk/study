"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function PageHeader({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  const router = useRouter();
  // 이전 페이지로 돌아간다(설명→데일리계획 등). 직접 진입(히스토리 없음)이면 홈으로.
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={goBack}
          className="text-brand-600 hover:underline"
        >
          ← 뒤로
        </button>
        <Link href="/" className="text-slate-400 hover:text-brand-600">
          홈
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  );
}

export function Spinner({ label = "AI가 생성 중입니다…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-semibold">오류가 발생했습니다</p>
      <p className="mt-1 whitespace-pre-wrap">{message}</p>
    </div>
  );
}

export function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 " +
        (props.className || "")
      }
    >
      {children}
    </button>
  );
}
