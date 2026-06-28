/**
 * 학습 코치 — 내 진도(localStorage)를 분석해서 "오늘 무엇을, 어떤 순서로"
 * 공부할지 개인화된 학습 계획을 만든다. 메뉴를 일일이 뒤지지 않아도
 * 코치가 다음 행동을 콕 집어준다.
 *
 * 순수 함수(브라우저 데이터만 입력)로, 홈 화면에서 그대로 사용한다.
 */
import topics from "@/data/topics.json";
import { ReviewItem, getItem, isDue } from "@/lib/storage";
import { WrongNote, QuizStats, dueNotes } from "@/lib/notes";

export type TopicLite = {
  id: string;
  title: string;
  category: string;
  importance: string;
};

export type CoachTask = {
  /** 정렬·렌더링용 종류 */
  kind: "wrong" | "review" | "weak" | "new" | "quiz";
  emoji: string;
  title: string;
  detail: string;
  href: string;
  /** 0=가장 급함 */
  priority: number;
  /** 화면 강조용 색 키 */
  tone: "rose" | "amber" | "violet" | "emerald" | "sky";
};

export type CoachPlan = {
  headline: string;
  subline: string;
  /** 가장 먼저 눌러야 할 단 하나의 행동 */
  primary: { label: string; href: string } | null;
  tasks: CoachTask[];
  /** 오늘 새로 시작하면 좋은 구체적 토픽(중요도 상 우선) */
  newTopics: TopicLite[];
  /** 오늘의 목표 진행도 */
  goal: { done: number; target: number };
};

const IMP_ORDER: Record<string, number> = { 상: 0, 출제예상: 1, 중: 2, 하: 3 };

/** 토픽을 두음신공에 바로 연결해서 여는 링크. auto=true면 도착 즉시 생성. */
export function mnemonicLink(
  t: { id: string; title: string },
  auto = false,
): string {
  const q = `/mnemonic?topicId=${encodeURIComponent(t.id)}&topic=${encodeURIComponent(t.title)}`;
  return auto ? `${q}&auto=1` : q;
}

/** 토픽을 설명 화면에 바로 연결해서 여는 링크. auto=true면 도착 즉시 생성. */
export function explainLink(t: { title: string }, auto = false): string {
  const q = `/explain?topic=${encodeURIComponent(t.title)}`;
  return auto ? `${q}&auto=1` : q;
}

/** 어떤 날짜 문자열이 오늘인지. */
function isToday(iso: string | null | undefined, now: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date(now);
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

/**
 * 개인화 학습 계획 생성.
 * 우선순위: ① 잊기 직전 오답 ② 복습 예정 회독 ③ 약점(정답률) 보강
 *           ④ 새 중요토픽 시작 ⑤ 분야 균형
 */
export function buildPlan(
  review: Record<string, ReviewItem>,
  notes: WrongNote[],
  stats: QuizStats,
  now: number = Date.now(),
  /** 오늘의 데일리 계획 토픽 — 주어지면 "오늘의 학습"이 이 토픽들과 동일해진다. */
  todayPlanTopics?: TopicLite[],
): CoachPlan {
  const all = topics as TopicLite[];
  const due = dueNotes(notes);

  // 회독 복습 대상(오늘 지난 것)
  const reviewDue = all.filter((t) => isDue(getItem(review, t.id)));
  // 새로 시작 추천 토픽 — 데일리 계획이 있으면 그 토픽과 "동일"하게 맞춘다.
  // (계획이 없을 때만) 아직 시작 안 한 중요도 상 토픽을 자동 추천.
  const newPicks =
    todayPlanTopics && todayPlanTopics.length
      ? todayPlanTopics
      : all
          .filter((t) => getItem(review, t.id).rounds === 0)
          .slice()
          .sort(
            (a, b) =>
              (IMP_ORDER[a.importance] ?? 9) - (IMP_ORDER[b.importance] ?? 9) ||
              a.category.localeCompare(b.category),
          )
          .slice(0, 3);

  // 분야별 완료율 → 가장 뒤처진 분야
  const cats = Array.from(new Set(all.map((t) => t.category)));
  const catProgress = cats
    .map((cat) => {
      const items = all.filter((t) => t.category === cat);
      const done = items.filter(
        (t) => getItem(review, t.id).status === "done",
      ).length;
      return { cat, done, total: items.length, pct: done / (items.length || 1) };
    })
    .sort((a, b) => a.pct - b.pct);
  const weakestCat = catProgress[0];

  const accuracy =
    stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : -1;

  const tasks: CoachTask[] = [];

  if (due.length > 0) {
    tasks.push({
      kind: "wrong",
      emoji: "📕",
      title: `오답 ${due.length}개 다시 풀기`,
      detail: "틀린 문제는 잊기 직전이에요. 가장 먼저 잡으세요.",
      href: "/notes",
      priority: 0,
      tone: "rose",
    });
  }
  if (reviewDue.length > 0) {
    tasks.push({
      kind: "review",
      emoji: "🔁",
      title: `복습 예정 토픽 ${reviewDue.length}개`,
      detail: "망각곡선 간격이 돌아왔어요. 오늘 복습하면 오래 갑니다.",
      href: "/review",
      priority: 1,
      tone: "amber",
    });
  }
  if (accuracy >= 0 && accuracy < 70) {
    tasks.push({
      kind: "weak",
      emoji: "🎯",
      title: `정답률 ${accuracy}% — 약점 보강`,
      detail: "퀴즈 정답률이 낮아요. 암기 퀴즈로 키워드를 더 굳히세요.",
      href: "/memorize",
      priority: 2,
      tone: "sky",
    });
  }
  if (newPicks.length > 0) {
    const imp = newPicks[0].importance;
    tasks.push({
      kind: "new",
      emoji: "🆕",
      title: `새 토픽 ${newPicks.length}개 시작 (중요도 ${imp} 우선)`,
      detail: "두음신공으로 키워드부터 외우고 답안 소설을 써보세요.",
      href: mnemonicLink(newPicks[0], true),
      priority: 3,
      tone: "violet",
    });
  }
  if (weakestCat && weakestCat.pct < 0.5) {
    tasks.push({
      kind: "weak",
      emoji: "📊",
      title: `취약 분야: ${weakestCat.cat} (${weakestCat.done}/${weakestCat.total})`,
      detail: "완료율이 가장 낮은 분야예요. 균형 있게 채워봅시다.",
      href: "/review",
      priority: 4,
      tone: "emerald",
    });
  }

  tasks.sort((a, b) => a.priority - b.priority);

  // 오늘의 목표 진행도 — 오늘 실제로 한 회독 수(=완료) 대비
  // 아직 남은 할 일(오답+복습)을 더해 목표치를 잡는다. 일을 할수록 채워진다.
  const doneToday = all.filter((t) =>
    isToday(getItem(review, t.id).lastReviewedAt, now),
  ).length;
  const remaining = due.length + reviewDue.length;
  const target =
    doneToday + remaining > 0
      ? doneToday + remaining
      : Math.max(1, Math.min(3, newPicks.length));

  // 헤드라인/서브라인 — 상황별 코칭 멘트
  let headline: string;
  let subline: string;
  if (due.length + reviewDue.length === 0 && stats.total === 0) {
    headline = "오늘부터 시작해 볼까요? 🚀";
    subline = "중요도 '상' 토픽부터 두음신공으로 키워드를 외워보세요.";
  } else if (due.length > 0) {
    headline = `잊기 전에 오답 ${due.length}개부터 잡아요 📕`;
    subline = "복습은 타이밍이 전부예요. 가장 급한 것부터 코치가 정리했어요.";
  } else if (reviewDue.length > 0) {
    headline = `오늘 복습할 토픽 ${reviewDue.length}개가 기다려요 🔁`;
    subline = "지금 복습하면 다음 간격이 늘어나 더 오래 기억돼요.";
  } else {
    headline = "복습은 끝! 새 토픽으로 전진해요 ✨";
    subline = "오늘 분량의 복습을 모두 마쳤어요. 새 키워드를 외울 시간!";
  }

  const primary = tasks.length
    ? { label: `${tasks[0].emoji} ${tasks[0].title}`, href: tasks[0].href }
    : newPicks.length
      ? { label: "🆕 새 토픽 시작하기", href: mnemonicLink(newPicks[0], true) }
      : null;

  return {
    headline,
    subline,
    primary,
    tasks,
    newTopics: newPicks,
    goal: { done: doneToday, target },
  };
}
