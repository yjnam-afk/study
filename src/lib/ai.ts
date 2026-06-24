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

type GenOpts = {
  system: string;
  user: string;
  temperature?: number;
  /** 폴백 체인에서 제공자별 모델을 덮어쓸 때 사용(예: groq의 보조 모델). */
  model?: string;
  /** 이 호출의 응답 토큰 상한(모델별 분당 한도 TPM에 맞춰 조정). */
  maxTokens?: number;
};

/**
 * 기본 응답 토큰 상한. Groq 무료 등급은 모델마다 분당 토큰(TPM)이 작아서
 * (요청 = 프롬프트 + max_tokens) 이 TPM을 넘으면 413이 난다. 그래서 모델별로
 * 안전 예산(groqBudget)을 따로 주고, 그 외에는 이 기본값을 쓴다.
 * 4096이면 일반적인 1·2교시 답안은 잘리지 않으면서 작은 모델 한도에도 들어간다.
 */
const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS) || 4096;

/** Groq 모델별 안전한 응답 토큰 예산(프롬프트 ~2.5k 가정, 각 모델 TPM 내). */
function groqBudget(model: string): number {
  if (model.includes("llama-3.3-70b")) return 6000; // TPM 12000
  if (model.includes("8b-instant")) return 3000; // TPM 6000
  if (model.includes("gpt-oss")) return 4500; // TPM 8000
  return MAX_TOKENS;
}

/**
 * AI 출력에 가끔 섞이는 일본어 가나·한자(중국어)·깨진 문자를 제거해 한글 답안만 남깁니다.
 */
function sanitizeOutput(text: string): string {
  return text
    .replace(/[぀-ヿｦ-ﾟ]/g, "") // 히라가나·가타카나·반각 가타카나
    .replace(/[一-鿿㐀-䶿]/g, "") // CJK 한자
    .replace(/�/g, "") // 대체 문자(�)
    .replace(/[ \t]{2,}/g, " ");
}


/** 제공자 이름 → 생성 함수 매핑. */
const PROVIDERS: Record<string, (opts: GenOpts) => Promise<string>> = {
  gemini: generateWithGemini,
  groq: generateWithGroq,
  openrouter: generateWithOpenRouter,
  ollama: generateWithOllama,
};

type ChainEntry = { name: string; model?: string; maxTokens?: number };

/** Groq 무료 등급은 토큰 한도(TPD)가 "모델별"로 따로 적용되므로,
 *  같은 API 키로 여러 모델을 폴백시키면 하나가 막혀도 다음 모델로 계속 동작한다.
 *  품질을 위해 "큰/좋은 모델"만 사용한다(작은 8b·20b는 한국어 두음 품질이 낮아 제외). */
function groqModels(): string[] {
  const primary = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const fallbacks = (
    process.env.GROQ_FALLBACK_MODELS ||
    "openai/gpt-oss-120b,moonshotai/kimi-k2-instruct,qwen/qwen3-32b"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set([primary, ...fallbacks]));
}

/**
 * 사용할 제공자 순서(폴백 체인).
 *  - AI_PROVIDERS="groq,openrouter,gemini" 처럼 콤마로 나열(앞의 것이 막히면 다음으로).
 *  - "groq:llama-3.1-8b-instant" 처럼 제공자:모델 로 모델까지 지정 가능.
 *  - groq를 모델 지정 없이 넣으면 여러 Groq 모델로 자동 확장(같은 키, 모델별 한도 분리).
 *  - 없으면 기존 AI_PROVIDER(단일, 기본 gemini) 사용.
 */
function providerChain(): ChainEntry[] {
  const multi = process.env.AI_PROVIDERS;
  const tokens = multi?.trim()
    ? multi.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [(process.env.AI_PROVIDER || "gemini").toLowerCase()];

  const entries: ChainEntry[] = [];
  const seen = new Set<string>();
  const add = (name: string, model?: string, maxTokens?: number) => {
    const key = `${name}:${model || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ name, model, maxTokens });
  };

  for (const token of tokens) {
    const idx = token.indexOf(":");
    const name = idx === -1 ? token : token.slice(0, idx);
    const model = idx === -1 ? undefined : token.slice(idx + 1).trim();
    if (name === "groq" && !model) {
      for (const m of groqModels()) add("groq", m, groqBudget(m));
    } else {
      add(name, model, name === "groq" && model ? groqBudget(model) : undefined);
    }
  }
  return entries;
}

/**
 * 시스템/사용자 프롬프트로 텍스트를 생성합니다.
 * 여러 제공자를 설정하면, 하나가 실패(429 토큰 초과·오류 등)할 때 다음 제공자로 자동 폴백합니다.
 */
export async function generateText(opts: GenOpts): Promise<string> {
  const chain = providerChain();
  const errors: string[] = [];
  let allConfigError = true;

  for (const { name, model, maxTokens } of chain) {
    const fn = PROVIDERS[name];
    const label = model ? `${name}(${model})` : name;
    if (!fn) {
      allConfigError = false;
      errors.push(`${label}: 알 수 없는 제공자`);
      continue;
    }
    try {
      return sanitizeOutput(await fn({ ...opts, model, maxTokens }));
    } catch (err) {
      if (!(err instanceof AIConfigError)) allConfigError = false;
      errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      // 다음 제공자(또는 다음 모델)로 폴백
    }
  }

  const detail = errors.join(" | ");
  if (allConfigError) {
    throw new AIConfigError(
      `사용 가능한 AI 제공자가 없습니다. 환경변수를 확인하세요. (${detail})`,
    );
  }
  throw new Error(`모든 AI 제공자가 실패했습니다 → ${detail}`);
}

async function generateWithGemini({
  system,
  user,
  temperature = 0.4,
  model: modelOverride,
  maxTokens,
}: GenOpts): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIConfigError(
      "GEMINI_API_KEY 가 설정되지 않았습니다. .env.local 파일에 키를 추가하세요. (https://aistudio.google.com/apikey)",
    );
  }
  const max = maxTokens || MAX_TOKENS;
  const model = modelOverride || process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gemma 계열 모델은 systemInstruction 필드를 지원하지 않으므로,
  // 시스템 프롬프트를 사용자 메시지 앞에 합쳐 전달한다.
  const isGemma = model.toLowerCase().includes("gemma");
  const body = isGemma
    ? {
        contents: [
          { role: "user", parts: [{ text: `${system}\n\n${user}` }] },
        ],
        generationConfig: { temperature, maxOutputTokens: max },
      }
    : {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature, maxOutputTokens: max },
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
  model: modelOverride,
  maxTokens,
}: GenOpts): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AIConfigError(
      "GROQ_API_KEY 가 설정되지 않았습니다. .env.local 파일에 키를 추가하세요. (https://console.groq.com/keys)",
    );
  }
  const model = modelOverride || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens || groqBudget(model),
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

async function generateWithOpenRouter({
  system,
  user,
  temperature = 0.4,
  model: modelOverride,
  maxTokens,
}: GenOpts): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AIConfigError(
      "OPENROUTER_API_KEY 가 설정되지 않았습니다. https://openrouter.ai/keys 에서 무료 키를 발급해 환경변수에 추가하세요.",
    );
  }
  // 기본값: 무료 Gemma. 다른 무료 모델은 https://openrouter.ai/models 에서 확인.
  const model =
    modelOverride || process.env.OPENROUTER_MODEL || "google/gemma-2-9b-it:free";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/yjnam-afk/study",
      "X-Title": "정보관리기술사 학습 앱",
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens || MAX_TOKENS,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenRouter API 오류 (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenRouter 응답이 비어 있습니다.");
  }
  return text.trim();
}

/**
 * 로컬 Ollama(내 PC)에서 Gemma 등을 실행해 사용합니다. API 키가 필요 없습니다.
 * ※ 로컬에서 앱을 실행할 때만 동작합니다(공개 Vercel 주소에서는 내 PC에 접속 불가).
 */
async function generateWithOllama({
  system,
  user,
  temperature = 0.4,
  model: modelOverride,
}: GenOpts): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = modelOverride || process.env.OLLAMA_MODEL || "gemma3:4b";

  let res: Response;
  try {
    res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch {
    throw new AIConfigError(
      `Ollama 서버(${base})에 연결할 수 없습니다. Ollama가 실행 중인지(앱 실행/'ollama serve'), 모델을 받았는지('ollama pull ${model}') 확인하세요.`,
    );
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Ollama 오류 (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Ollama 응답이 비어 있습니다.");
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
