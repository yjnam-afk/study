"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";

/**
 * 학습법 가이드 — "지치지 않고 오래 가는 공부법".
 * 학습과학(인출·분산·교차·정교화) 기반. 스터디원 설득 자료 겸 앱 사용 안내.
 * 재치 문구 없이 방법 위주, 말랑 파스텔 톤.
 */
export default function GuidePage() {
  return (
    <div>
      <PageHeader
        title="🧠 지치지 않고 오래 가는 공부법"
        desc="벼락치기가 지치는 건 매번 리셋되기 때문. 쌓이면 안 지칩니다."
      />

      {/* 핵심 한 줄 */}
      <section className="mb-6 rounded-2xl bg-gradient-to-br from-slate-100 via-slate-100 to-slate-100 p-6 ring-1 ring-slate-100">
        <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
          단기 암기는 아무리 해도 증발해서 늘 <b className="text-brand-600">0에서 다시 시작</b> →
          그래서 지칩니다. 핵심은 <b className="text-brand-600">고강도·단기 → 저강도·장기</b>로
          바꿔 <b className="text-brand-600">쌓이게</b> 만드는 것. 그 엔진이 아래 4가지예요.
        </p>
      </section>

      {/* 4대 엔진 — 인분교정 */}
      <section className="mb-8">
        <h2 className="mb-1 text-lg font-bold text-slate-800">
          4대 엔진 —{" "}
          <span className="text-brand-600">인·분·교·정</span>
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          학습과학이 검증한, 오래 남는 공부의 4원리.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              k: "인",
              t: "인출 (Retrieval)",
              d: "안 보고 기억에서 꺼내기(백지·셀프퀴즈). 낑낑대며 꺼내는 그 부하가 기억을 굳힙니다. ‘보고 읽기’는 인출이 아니에요.",
            },
            {
              k: "분",
              t: "분산 (Spacing)",
              d: "몰아치지 말고 간격 두고 반복. 망각곡선 간격(1일→3일→7일→14일)으로 잊을 때쯤 다시 꺼냅니다.",
            },
            {
              k: "교",
              t: "교차 (Interleaving)",
              d: "한 도메인만 파지 말고 섞기(네트워크→보안→DB). 지루함과 ‘안다는 착각’을 막아줍니다.",
            },
            {
              k: "정",
              t: "정교화 (Elaboration)",
              d: "꺼낸 걸 자기 언어로 설명하고 다른 개념과 연결. 파인만 기법 — 가르치면 두 번 배웁니다.",
            },
          ].map((x) => (
            <div
              key={x.k}
              className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-300 to-slate-300 text-lg font-extrabold text-white">
                {x.k}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">{x.t}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {x.d}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 하루 루틴 */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-slate-800">
          🌱 지치지 않는 하루 루틴{" "}
          <span className="text-sm font-normal text-slate-400">
            (30~40분이면 충분)
          </span>
        </h2>
        <ol className="space-y-2">
          {[
            [
              "신규 3~5개",
              "두음신공으로 뼈대만 잡기(20분). 완벽 말고 70%만 — 어차피 다시 봅니다.",
            ],
            [
              "어제·그저께 것 인출 복습",
              "안 보고 두음+키워드 떠올리기(10분). ← 이게 ‘쌓임’의 핵심.",
            ],
            [
              "여기서 멈추기",
              "더 하고 싶어도 멈춥니다. 내일도 해야 하니까 — 지속이 실력.",
            ],
          ].map(([t, d], i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-brand-600">
                {i + 1}
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-800">{t}</div>
                <p className="mt-0.5 text-xs text-slate-600">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 스터디 모임 */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-slate-800">
          👥 스터디 모임은 이렇게
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="text-sm font-bold text-brand-700">
              돌아가며 30초 설명
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              한 명이 책 덮고 30초 설명 → 나머지가 ‘빠진 키워드’ 하나씩 지적.
              지적당한 게 제일 오래 남습니다(정교화).
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="text-sm font-bold text-brand-700">
              답안은 “가리고 인출해서” 쓰기
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              보고 베끼면 낭독, 가리고 쓰면 인출+출력 훈련. 답안 연습과 인출을
              동시에 잡는 두 마리 토끼.
            </p>
          </div>
        </div>
      </section>

      {/* 시기 배분 */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-slate-800">
          🗓️ 시기별 비중 (단기 통암기는 ‘직전 마무리’용)
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-4 py-2">시기</th>
                <th className="px-4 py-2">인출·이해</th>
                <th className="px-4 py-2">답안 쓰기·실전</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2 font-medium">D-3개월~</td>
                <td className="px-4 py-2">70%</td>
                <td className="px-4 py-2">30%</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2 font-medium">D-3~4주</td>
                <td className="px-4 py-2">30%</td>
                <td className="px-4 py-2">70%</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">D-며칠</td>
                <td className="px-4 py-2" colSpan={2}>
                  이때만 단기 통암기로 마무리 (평소 방법 아님)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 앱 기능 매핑 */}
      <section className="mb-8">
        <h2 className="mb-1 text-lg font-bold text-slate-800">
          📘 이 앱은 이미 이 시스템입니다
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          엔진은 다 있어요. 벼락치기로 새지 말고 이렇게 쓰세요.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["인출", "두음신공", "/mnemonic", "두음으로 뼈대 잡고 ‘주관식 확인’에서 안 보고 꺼내기"],
            ["분산", "회독 관리", "/review", "망각곡선 간격으로 오늘 복습할 것만 추천"],
            ["약점", "오답노트", "/notes", "틀린 키워드만 집중 반복"],
            ["분산배정", "데일리 계획", "/plan", "하루치만 배정 — 몰아치지 않게"],
          ].map(([tag, name, href, d]) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:bg-slate-50/40"
            >
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                {tag}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  {name} →
                </div>
                <div className="truncate text-xs text-slate-500">{d}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
        “빨리 외워서 써보자”는 <b className="text-slate-700">시험 직전엔 맞지만</b>,
        지금부터 그러면 3개월 내내 밑빠진 독에 물 붓기.
        <br />
        <b className="text-brand-600">쌓이는 공부</b>가 결국 지치지 않고, 결국 이깁니다.
      </p>
    </div>
  );
}
