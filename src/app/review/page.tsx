"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import topics from "@/data/topics.json";
import {
  ReviewItem,
  loadReview,
  saveReview,
  getItem,
  markReviewed,
  resetItem,
  isDue,
  daysUntilDue,
} from "@/lib/storage";
import { loadSession, Session } from "@/lib/auth";
import { syncNow } from "@/lib/sync";

const STATUS_LABEL: Record<string, string> = {
  todo: "시작 전",
  learning: "학습 중",
  done: "완료",
};
const STATUS_STYLE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-500",
  learning: "bg-amber-100 text-amber-700",
  done: "bg-amber-100 text-amber-700",
};

const IMP_ORDER: Record<string, number> = { 상: 0, 중: 1, 하: 2, 출제예상: 3 };
const IMP_STYLE: Record<string, string> = {
  상: "bg-red-100 text-red-700",
  중: "bg-amber-100 text-amber-700",
  하: "bg-slate-100 text-slate-500",
  출제예상: "bg-slate-100 text-brand-700",
};
const IMP_FILTERS = ["전체", "상", "중", "하", "출제예상"];
const PAGE_SIZE = 50;

export default function ReviewPage() {
  const [state, setState] = useState<Record<string, ReviewItem>>({});
  const [ready, setReady] = useState(false);
  const [impFilter, setImpFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [syncState, setSyncState] = useState<
    "idle" | "syncing" | "done" | "error"
  >("idle");
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    const refresh = () => setState(loadReview());
    refresh();
    setReady(true);
    setSession(loadSession());
    const onAuth = () => setSession(loadSession());
    // 서버 동기화 완료(로그인 시 서버→로컬 복원)·다른 탭 변경 시 진도를 다시 읽어 화면에 반영
    window.addEventListener("progress-synced", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("auth-change", onAuth);
    return () => {
      window.removeEventListener("progress-synced", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("auth-change", onAuth);
    };
  }, []);

  // 서버에서 내 진도를 수동으로 불러온다(에러를 눈에 보이게 표시).
  async function restoreFromServer() {
    const s = loadSession();
    if (!s) {
      setSyncState("error");
      setSyncMsg("로그인이 필요합니다. 우측 상단에서 로그인하세요.");
      return;
    }
    setSyncState("syncing");
    setSyncMsg("서버에서 불러오는 중…");
    try {
      const before = topics.filter(
        (t) => getItem(loadReview(), t.id).status === "done",
      ).length;
      await syncNow(s);
      const merged = loadReview();
      setState(merged);
      const after = topics.filter(
        (t) => getItem(merged, t.id).status === "done",
      ).length;
      const rounds = topics.reduce(
        (sum, t) => sum + getItem(merged, t.id).rounds,
        0,
      );
      setSyncState("done");
      setSyncMsg(
        `동기화 완료 · 완료 ${after}개 / 총 회독 ${rounds}회` +
          (after > before ? ` (서버에서 ${after - before}개 복원)` : ""),
      );
    } catch (e) {
      setSyncState("error");
      setSyncMsg(
        `동기화 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
      );
    }
  }

  const fileRef = useRef<HTMLInputElement | null>(null);

  // 현재 브라우저의 회독 진도를 JSON 파일로 내려받는다(백업).
  function exportProgress() {
    const review = loadReview();
    const done = topics.filter(
      (t) => getItem(review, t.id).status === "done",
    ).length;
    const blob = new Blob(
      [
        JSON.stringify(
          { type: "info-pe-review", exportedAt: new Date().toISOString(), review },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `회독진도_완료${done}개_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncState("done");
    setSyncMsg(`백업 내려받음 · 완료 ${done}개 포함`);
  }

  // 백업 JSON을 읽어 현재 진도와 병합 저장한다(더 많이 진행된 쪽 채택).
  async function importProgress(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const incoming: Record<string, ReviewItem> = parsed.review || parsed;
      if (!incoming || typeof incoming !== "object")
        throw new Error("형식이 올바르지 않습니다.");
      const cur = loadReview();
      const merged: Record<string, ReviewItem> = { ...cur };
      for (const [id, s] of Object.entries(incoming)) {
        const l = merged[id];
        const sWins =
          !l ||
          s.rounds > l.rounds ||
          (s.rounds === l.rounds &&
            Date.parse(s.lastReviewedAt || "") >
              Date.parse(l.lastReviewedAt || ""));
        if (sWins) merged[id] = s;
      }
      saveReview(merged); // progress-change 발행 → 로그인 시 서버로도 업로드
      setState(merged);
      const done = topics.filter(
        (t) => getItem(merged, t.id).status === "done",
      ).length;
      setSyncState("done");
      setSyncMsg(`백업 가져오기 완료 · 완료 ${done}개`);
      const s = loadSession();
      if (s) syncNow(s).catch(() => {});
    } catch (e) {
      setSyncState("error");
      setSyncMsg(
        `가져오기 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
      );
    }
  }

  // 필터·검색이 바뀌면 첫 페이지로
  useEffect(() => {
    setPage(0);
  }, [impFilter, query]);

  function update(next: Record<string, ReviewItem>) {
    setState(next);
    saveReview(next);
  }

  const total = topics.length;
  const doneCount = topics.filter(
    (t) => getItem(state, t.id).status === "done",
  ).length;
  const totalRounds = topics.reduce(
    (sum, t) => sum + getItem(state, t.id).rounds,
    0,
  );
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  // 오늘 복습할 토픽(복습일 지남), 많이 밀린 순으로 정렬
  const dueTopics = ready
    ? topics
        .filter((t) => isDue(getItem(state, t.id)))
        .sort(
          (a, b) =>
            daysUntilDue(getItem(state, a.id)) -
            daysUntilDue(getItem(state, b.id)),
        )
    : [];

  return (
    <div>
      <PageHeader
        title="🔁 회독 관리"
        desc="망각곡선(1·3·7·14·30일) 간격으로 복습할 토픽을 추천합니다. 3회독 시 완료. (로그인하면 계정에 저장되어 다른 기기에서도 이어집니다.)"
      />

      <div
        className={`mb-6 flex flex-col gap-2 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
          syncState === "error"
            ? "border-red-200 bg-red-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="min-w-0 text-sm">
          {session ? (
            <p className="font-medium text-slate-700">
              ☁️ <b>{session.name}</b> 계정으로 로그인됨
              {syncMsg && (
                <span
                  className={`ml-1 ${syncState === "error" ? "text-red-600" : "text-slate-500"}`}
                >
                  — {syncMsg}
                </span>
              )}
            </p>
          ) : (
            <p className="text-slate-600">
              로그인하면 이 계정에 저장된 회독 기록을 서버에서 불러올 수 있어요.{" "}
              <Link
                href="/login"
                className="font-semibold text-brand-600 hover:underline"
              >
                로그인 →
              </Link>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {session && (
            <button
              onClick={restoreFromServer}
              disabled={syncState === "syncing"}
              className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {syncState === "syncing"
                ? "불러오는 중…"
                : "☁️ 서버에서 내 진도 불러오기"}
            </button>
          )}
          <button
            onClick={exportProgress}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            ⬇️ 백업 내보내기
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            ⬆️ 백업 가져오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importProgress(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="전체 토픽" value={`${total}개`} />
        <Stat label="완료(3회독)" value={`${doneCount}개`} />
        <Stat label="총 회독 수" value={`${totalRounds}회`} />
        <Stat label="오늘 복습" value={`${dueTopics.length}개`} />
      </div>

      {ready && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-amber-800">
            🔔 오늘 복습할 토픽 ({dueTopics.length})
          </h2>
          {dueTopics.length === 0 ? (
            <p className="mt-2 text-sm text-amber-700">
              오늘 복습할 토픽이 없습니다. 새 토픽을 시작하거나 푹 쉬세요 👍
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {dueTopics.map((t) => {
                const item = getItem(state, t.id);
                const overdue = -daysUntilDue(item);
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <span className="text-xs text-slate-400">{t.category}</span>
                      <p className="truncate font-medium text-slate-900">
                        {t.title}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        {overdue > 0 ? `${overdue}일 지남` : "오늘"}
                      </span>
                      <Link
                        href={`/mnemonic?topicId=${encodeURIComponent(t.id)}&topic=${encodeURIComponent(t.title)}&auto=1`}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                      >
                        🥷 학습
                      </Link>
                      <button
                        onClick={() => update(markReviewed(state, t.id))}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                      >
                        복습 완료
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-slate-700">완료 진도</span>
          <span className="text-slate-500">{progress}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-slate-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {IMP_FILTERS.map((f) => {
          const count =
            f === "전체"
              ? topics.length
              : topics.filter((t) => t.importance === f).length;
          return (
            <button
              key={f}
              onClick={() => setImpFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                impFilter === f
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f} {count}
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 토픽·분야 검색 (전체 2,603개 중에서 찾기)"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:border-brand-400"
        />
      </div>

      {(() => {
        const q = query.trim().toLowerCase();
        const filtered = topics
          .filter((t) => impFilter === "전체" || t.importance === impFilter)
          .filter(
            (t) =>
              !q ||
              t.title.toLowerCase().includes(q) ||
              (t.category || "").toLowerCase().includes(q) ||
              (t.summary || "").toLowerCase().includes(q),
          )
          .sort(
            (a, b) =>
              (IMP_ORDER[a.importance] ?? 9) - (IMP_ORDER[b.importance] ?? 9),
          );
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        const cur = Math.min(page, totalPages - 1);
        const pageItems = filtered.slice(
          cur * PAGE_SIZE,
          cur * PAGE_SIZE + PAGE_SIZE,
        );
        return (
          <>
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                검색 결과 <b className="text-slate-700">{filtered.length}</b>개
                {filtered.length > PAGE_SIZE && (
                  <>
                    {" "}
                    · {cur * PAGE_SIZE + 1}–
                    {Math.min(cur * PAGE_SIZE + PAGE_SIZE, filtered.length)} 표시
                  </>
                )}
              </span>
              {totalPages > 1 && (
                <span>
                  {cur + 1} / {totalPages} 페이지
                </span>
              )}
            </div>
            <div className="space-y-3">
              {pageItems.map((t) => {
          const item: ReviewItem = ready ? getItem(state, t.id) : getItem({}, t.id);
          const showDue = item.rounds > 0 && item.status !== "done";
          const dleft = daysUntilDue(item);
          return (
            <div
              key={t.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                  {t.importance && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${IMP_STYLE[t.importance] || "bg-slate-100 text-slate-500"}`}
                    >
                      {t.importance}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{t.group || t.category}</span>
                </div>
                <h3 className="mt-1 font-semibold text-slate-900">{t.title}</h3>
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                  {t.summary}
                </p>
                {showDue && (
                  <p className="mt-1 text-xs text-slate-400">
                    다음 복습:{" "}
                    {dleft > 0
                      ? `${dleft}일 후`
                      : dleft === 0
                        ? "오늘"
                        : `${-dleft}일 지남`}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="flex items-center gap-1" title="회독 횟수">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.rounds >= n ? "bg-brand-600" : "bg-slate-200"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-sm font-medium text-slate-600">
                    {item.rounds}회
                  </span>
                </div>

                <Link
                  href={`/mnemonic?topicId=${encodeURIComponent(t.id)}&topic=${encodeURIComponent(t.title)}&auto=1`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  🥷 복습
                </Link>
                <button
                  onClick={() => update(markReviewed(state, t.id))}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  +1 회독
                </button>
                {item.rounds > 0 && (
                  <button
                    onClick={() => update(resetItem(state, t.id))}
                    className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-red-500"
                    title="초기화"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          );
        })}
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={cur === 0}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-30 hover:bg-slate-50"
                >
                  ‹ 이전
                </button>
                <span className="px-2 text-sm text-slate-500">
                  {cur + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={cur >= totalPages - 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-30 hover:bg-slate-50"
                >
                  다음 ›
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
