import type { Metadata } from "next";
import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "정보관리기술사 학습 앱",
  description:
    "정보관리기술사 시험 대비 — 답안지 생성, 토픽 설명, 암기(플래시카드·퀴즈), 회독 관리",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
                정
              </span>
              정보관리기술사 학습
            </Link>
            <div className="flex items-center gap-4">
              <nav className="hidden gap-4 text-sm font-medium text-slate-600 lg:flex">
                <Link href="/" className="hover:text-brand-600">대시보드</Link>
                <Link href="/answer" className="hover:text-brand-600">답안지</Link>
                <Link href="/grade" className="hover:text-brand-600">자가채점</Link>
                <Link href="/explain" className="hover:text-brand-600">토픽 설명</Link>
                <Link href="/mnemonic" className="hover:text-brand-600">두음신공</Link>
                <Link href="/memorize" className="hover:text-brand-600">암기</Link>
                <Link href="/notes" className="hover:text-brand-600">오답노트</Link>
                <Link href="/review" className="hover:text-brand-600">회독</Link>
              </nav>
              <AuthNav />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-slate-400">
          정보관리기술사 학습 앱 · AI 응답은 참고용이며 실제 채점 기준과 다를 수 있습니다.
        </footer>
      </body>
    </html>
  );
}
