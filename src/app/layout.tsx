import type { Metadata } from "next";
import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import AuthGate from "@/components/AuthGate";
import ProgressSync from "@/components/ProgressSync";
import DeployBanner from "@/components/DeployBanner";
import GlobalAudioPlayer from "@/components/GlobalAudioPlayer";
import CursorTrail from "@/components/CursorTrail";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://study-teal-eight.vercel.app"),
  title: "말랑말랑 소설클럽",
  description:
    "기술사 답안은 '소설'이다 — 키워드 암기(두음신공)와 키워드로 답안 쓰기를 말랑말랑하게 훈련하는 정보관리기술사 학습 앱",
  openGraph: {
    title: "말랑말랑 소설클럽",
    description:
      "기술사 답안은 소설이다 ✍️ 두음신공 암기 + 키워드 답안쓰기. 같이 공부해요!",
    url: "https://study-teal-eight.vercel.app",
    siteName: "말랑말랑 소설클럽",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
    type: "website",
  },
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
              <span className="grid h-8 w-8 place-items-center rounded-2xl bg-gradient-to-br from-pink-300 to-violet-300 text-base shadow-sm">
                🍡
              </span>
              말랑말랑 소설클럽
            </Link>
            <div className="flex items-center gap-4">
              <nav className="hidden gap-4 text-sm font-medium text-slate-600 lg:flex">
                <Link href="/plan" className="font-semibold text-rose-600 hover:text-rose-700">🗓️ 계획</Link>
                <Link href="/mnemonic" className="hover:text-brand-600">두음신공</Link>
                <Link href="/commute" className="hover:text-brand-600">🚇 지하철</Link>
                <Link href="/answer" className="font-semibold text-brand-600 hover:text-brand-700">답안쓰기</Link>
                <Link href="/exam" className="hover:text-brand-600">기출문제</Link>
                <Link href="/grade" className="hover:text-brand-600">자가채점</Link>
                <Link href="/guide" className="hover:text-brand-600">🧠 학습법</Link>
              </nav>
              <AuthNav />
            </div>
          </div>
        </header>
        <ProgressSync />
        <DeployBanner />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <AuthGate>{children}</AuthGate>
        </main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-slate-400">
          말랑말랑 소설클럽 · 정보관리기술사 학습 · AI 응답은 참고용이며 실제 채점 기준과 다를 수 있습니다.
        </footer>
        <GlobalAudioPlayer />
        <CursorTrail />
      </body>
    </html>
  );
}
