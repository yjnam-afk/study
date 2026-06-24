/**
 * 클로드(Claude)가 방법론대로 미리 작성한 "모범답안" 뱅크.
 * 런타임 LLM 호출 없이(=무료) 최고 품질 답안을 보여주기 위한 정적 데이터.
 * 각 답안에는 source(근거·출처)가 있어 어디서 만든 답안인지 명확히 표시한다.
 */
import data from "@/data/modelAnswers.json";
import questions from "@/data/questions.json";

export type ModelAnswer = {
  period: string;
  title: string;
  answer: string;
  source: string;
};

const MA = data as Record<string, ModelAnswer>;

/** 문제 id로 모범답안 조회(예: k139-101). */
export function getModelAnswer(id?: string): ModelAnswer | null {
  if (!id) return null;
  return MA[id] || null;
}

/** 문제 본문으로 모범답안 조회(questions.json의 id 매칭). */
export function getModelAnswerByQuestion(text?: string): ModelAnswer | null {
  const t = (text || "").trim();
  if (!t) return null;
  const q = (questions as { id: string; text: string }[]).find(
    (x) => x.text.trim() === t,
  );
  return q ? getModelAnswer(q.id) : null;
}

/** 모범답안이 존재하는 문제 id 집합. */
export function hasModelAnswer(id?: string): boolean {
  return Boolean(id && MA[id]);
}
