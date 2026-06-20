import Link from "next/link";

const menus = [
  {
    href: "/answer",
    emoji: "📝",
    title: "답안지 생성",
    desc: "1교시(용어형)·2교시(서술형) 문제에 대한 시험 답안지를 AI가 작성해 줍니다.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    href: "/explain",
    emoji: "💡",
    title: "토픽 설명",
    desc: "어려운 토픽을 비유와 도식으로 이해하기 쉽게 풀어 설명합니다.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    href: "/memorize",
    emoji: "🧠",
    title: "암기 (플래시카드·퀴즈)",
    desc: "토픽으로 플래시카드와 4지선다 퀴즈를 만들어 암기를 돕습니다.",
    color: "from-amber-500 to-orange-600",
  },
  {
    href: "/review",
    emoji: "🔁",
    title: "회독 관리",
    desc: "토픽별 회독 횟수와 진도를 기록하고 반복 학습을 관리합니다.",
    color: "from-fuchsia-500 to-pink-600",
  },
];

export default function Home() {
  return (
    <div>
      <section className="mb-10 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">정보관리기술사 학습 앱</h1>
        <p className="mt-2 max-w-2xl text-brand-50">
          답안지 작성부터 개념 이해, 암기, 회독까지. AI와 함께 효율적으로 합격을
          준비하세요.
        </p>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        {menus.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div
              className={`mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${m.color} text-2xl`}
            >
              {m.emoji}
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-brand-600">
              {m.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {m.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
