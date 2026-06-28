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

/** Groq 모델별 안전한 응답 토큰 예산.
 *  요청(=프롬프트+max_tokens)이 모델별 분당한도(TPM)를 넘으면 413이 나므로
 *  프롬프트 ~3.5k를 가정해 TPM 안에 들어가도록 보수적으로 잡는다. */
function groqBudget(model: string): number {
  if (model.includes("llama-3.3-70b")) return 5000; // TPM 12000
  if (model.includes("kimi-k2")) return 3000; // TPM 8000
  if (model.includes("gpt-oss-120b")) return 3000; // TPM 8000
  if (model.includes("gpt-oss-20b")) return 3000; // TPM 8000
  if (model.includes("8b-instant")) return 2000; // TPM 6000
  return 3000;
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
  anthropic: generateWithAnthropic,
  claude: generateWithAnthropic,
  gemini: generateWithGemini,
  groq: generateWithGroq,
  openrouter: generateWithOpenRouter,
  ollama: generateWithOllama,
};

type ChainEntry = { name: string; model?: string; maxTokens?: number };

/** Groq 무료 등급은 토큰 한도(TPD)가 "모델별"로 따로 적용되므로,
 *  같은 API 키로 여러 모델을 폴백시키면 하나가 막혀도 다음 모델로 계속 동작한다.
 *  앞쪽이 최고사양(품질), 뒤쪽은 비상용(작지만 한도 여유) — 앱이 완전히 멈추지 않도록. */
function groqModels(): string[] {
  const primary = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const fallbacks = (
    process.env.GROQ_FALLBACK_MODELS ||
    "openai/gpt-oss-120b,moonshotai/kimi-k2-instruct,openai/gpt-oss-20b,llama-3.1-8b-instant"
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
  const entries: ChainEntry[] = [];
  const seen = new Set<string>();
  const add = (name: string, model?: string, maxTokens?: number) => {
    const key = `${name}:${model || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ name, model, maxTokens });
  };
  // 제공자 1개 추가(groq는 모델 미지정 시 여러 모델로 자동 확장).
  const addProvider = (name: string, model?: string) => {
    if (name === "groq" && !model) {
      for (const m of groqModels()) add("groq", m, groqBudget(m));
    } else {
      add(name, model, name === "groq" && model ? groqBudget(model) : undefined);
    }
  };

  // 1) 명시적으로 설정한 순서를 최우선으로 사용.
  const multi = process.env.AI_PROVIDERS;
  const explicit = multi?.trim()
    ? multi.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : process.env.AI_PROVIDER
      ? [process.env.AI_PROVIDER.toLowerCase()]
      : [];
  for (const token of explicit) {
    const idx = token.indexOf(":");
    const name = idx === -1 ? token : token.slice(0, idx);
    const model = idx === -1 ? undefined : token.slice(idx + 1).trim();
    addProvider(name, model);
  }

  // 2) (자동 폴백) 키가 설정된 모든 무료 제공자를 체인 뒤에 자동으로 덧붙인다.
  //    → AI_PROVIDERS를 일일이 맞추지 않아도, 키만 있으면 한도 소진 시 다음 제공자로 넘어간다.
  if (groqKeys().length) addProvider("groq"); // 여러 모델 × 여러 키 = 한도 폭 ↑
  if (process.env.GEMINI_API_KEY) {
    // Gemini 무료 등급은 일일 한도가 Groq보다 훨씬 커서 강력한 폴백.
    addProvider("gemini");
    addProvider("gemini", "gemini-2.0-flash-lite");
  }
  if (process.env.OPENROUTER_API_KEY) {
    addProvider("openrouter");
    addProvider("openrouter", "meta-llama/llama-3.3-70b-instruct:free");
  }
  if (process.env.ANTHROPIC_API_KEY) addProvider("anthropic"); // 최후 보루(저렴·고품질)
  if (process.env.OLLAMA_BASE_URL) addProvider("ollama");

  // 3) 아무것도 없으면 기존 기본값(gemini).
  if (!entries.length) addProvider("gemini");
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
  // 사용량 한도(429/413/TPD/TPM) 신호가 있으면 깔끔한 안내 메시지로 바꿔준다.
  const rateLimited =
    /rate.?limit|too large|tokens per|\bTP[DM]\b|quota|\b429\b|\b413\b/i.test(
      detail,
    );
  const authIssue = /unauthorized|\b401\b|invalid.?api.?key/i.test(detail);
  if (rateLimited && !authIssue) {
    throw new Error(
      "지금 무료 AI 사용량이 가득 찼어요(하루·분당 한도). 몇 분 뒤 다시 시도하거나, 기출 메뉴의 '클로드 모범답안'을 이용해 주세요.",
    );
  }
  throw new Error("AI 생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
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

/**
 * Anthropic Claude. 무료는 아니지만 Haiku는 매우 저렴(이 앱 사용량이면 월 몇 백 원 수준)하고
 * 품질이 가장 좋다. 키만 있으면 AI_PROVIDERS="anthropic,groq" 로 최우선 사용.
 */
async function generateWithAnthropic({
  system,
  user,
  temperature = 0.4,
  model: modelOverride,
  maxTokens,
}: GenOpts): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AIConfigError(
      "ANTHROPIC_API_KEY 가 설정되지 않았습니다. https://console.anthropic.com/ 에서 키를 발급해 환경변수에 추가하세요.",
    );
  }
  const model = modelOverride || process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens || MAX_TOKENS,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API 오류 (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = Array.isArray(data?.content)
    ? data.content.map((b: { text?: string }) => b.text || "").join("")
    : "";
  if (!text) {
    throw new Error("Anthropic 응답이 비어 있습니다.");
  }
  return text.trim();
}

/** Groq API 키 목록. 한도는 키(계정)별로 따로라 여러 개면 그만큼 한도가 늘어난다.
 *  GROQ_API_KEYS(콤마 구분) + GROQ_API_KEY / GROQ_API_KEY_2 / _3 ... 모두 모은다. */
function groqKeys(): string[] {
  const raw: string[] = [];
  // GROQ_API_KEYS, GROQ_API_KEY, GROQ_API_KEY_2.. 모두 콤마로 분리 허용
  // (기존 GROQ_API_KEY 변수에 콤마로 여러 개 넣어도 동작하도록)
  if (process.env.GROQ_API_KEYS) raw.push(...process.env.GROQ_API_KEYS.split(","));
  if (process.env.GROQ_API_KEY) raw.push(...process.env.GROQ_API_KEY.split(","));
  for (let i = 2; i <= 6; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) raw.push(...k.split(","));
  }
  // 각 키에서 공백·줄바꿈 완전 제거(붙여넣기 시 섞인 whitespace/return 문자 방지)
  return Array.from(
    new Set(raw.map((s) => s.replace(/\s/g, "")).filter(Boolean)),
  );
}

async function generateWithGroq({
  system,
  user,
  temperature = 0.4,
  model: modelOverride,
  maxTokens,
}: GenOpts): Promise<string> {
  const keys = groqKeys();
  if (keys.length === 0) {
    throw new AIConfigError(
      "GROQ_API_KEY 가 설정되지 않았습니다. .env.local 파일에 키를 추가하세요. (https://console.groq.com/keys)",
    );
  }
  const model = modelOverride || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const body = JSON.stringify({
    model,
    temperature,
    max_tokens: maxTokens || groqBudget(model),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  let lastErr = "";
  for (const apiKey of keys) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Groq 응답이 비어 있습니다.");
      return text.trim();
    }
    const detail = await res.text();
    lastErr = `Groq API 오류 (${res.status}): ${detail}`;
    // 429(한도 초과)·5xx만 다음 키로 재시도. 400/413 등은 키 바꿔도 동일 → 즉시 중단.
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new Error(lastErr || "Groq 호출 실패");
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
