/**
 * AI 제공자 추상화 레이어.
 *
 * 기본 제공자는 Google Gemini(무료 등급)이며, 환경변수 AI_PROVIDER=groq 로
 * 설정하면 Groq(무료 등급)로 교체할 수 있습니다. 두 제공자 모두 무료로
 * 사용할 수 있어 학습용 앱에 적합합니다.
 *
 * 새로운 제공자를 추가하려면 generateText 의 switch 문에 분기를 추가하세요.
 */

export type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export class AIConfigError extends Error {}

const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

/** 시스템 프롬프트 + 사용자 프롬프트로 텍스트를 생성합니다. */
export async function generateText(opts: {
  system: string;
  user: string;
  /** 0(보수적) ~ 1(창의적). 기본 0.4 */
  temperature?: number;
}): Promise<string> {
  switch (provider) {
    case "gemini":
      return generateWithGemini(opts);
    case "groq":
      return generateWithGroq(opts);
    default:
      throw new AIConfigError(
        `알 수 없는 AI_PROVIDER 입니다: "${provider}". gemini 또는 groq 를 사용하세요.`,
      );
  }
}

async function generateWithGemini({
  system,
  user,
  temperature = 0.4,
}: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIConfigError(
      "GEMINI_API_KEY 가 설정되지 않았습니다. .env.local 파일에 키를 추가하세요. (https://aistudio.google.com/apikey)",
    );
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gemma 계열 모델은 systemInstruction 필드를 지원하지 않으므로,
  // 시스템 프롬프트를 사용자 메시지 앞에 합쳐 전달한다.
  const isGemma = model.toLowerCase().includes("gemma");
  const body = isGemma
    ? {
        contents: [
          { role: "user", parts: [{ text: `${system}\n\n${user}` }] },
        ],
        generationConfig: { temperature, maxOutputTokens: 4096 },
      }
    : {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature, maxOutputTokens: 4096 },
      };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini API 오류 (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text || "")
    .join("");
  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }
  return text.trim();
}

async function generateWithGroq({
  system,
  user,
  temperature = 0.4,
}: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AIConfigError(
      "GROQ_API_KEY 가 설정되지 않았습니다. .env.local 파일에 키를 추가하세요. (https://console.groq.com/keys)",
    );
  }
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: 4096,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Groq API 오류 (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Groq 응답이 비어 있습니다.");
  }
  return text.trim();
}

/**
 * 모델이 JSON 코드블록(```json ... ```)으로 감싸 응답하는 경우가 많아,
 * 순수 JSON 문자열만 추출해 파싱합니다.
 */
export function parseJsonFromModel<T>(raw: string): T {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    text = fenced[1].trim();
  }
  // 코드블록이 없으면 첫 { 또는 [ 부터 마지막 } 또는 ] 까지 추출
  if (!fenced) {
    const start = text.search(/[[{]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start !== -1 && end !== -1) {
      text = text.slice(start, end + 1);
    }
  }
  return JSON.parse(text) as T;
}
