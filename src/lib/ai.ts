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
  /** 완성 검증. 통과 못 하면 "그 제공자 실패"로 보고 다음 제공자로 폴백한다.
   *  (약한 모델이 잘린 출력을 내며 체인을 가로채는 문제 방지) */
  valid?: (text: string) => boolean;
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
  cerebras: generateWithCerebras,
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
  if (groqKeys().length) {
    const models = groqModels();
    add("groq", models[0], groqBudget(models[0])); // 주력(70b) 먼저
    // Cerebras(70b·일 100만 토큰급)를 Groq 꼬마 모델들보다 먼저 —
    // 꼬마 모델이 잘린 출력으로 체인을 가로채는 것 방지.
    if (process.env.CEREBRAS_API_KEY) addProvider("cerebras");
    for (const m of models.slice(1)) add("groq", m, groqBudget(m));
  } else if (process.env.CEREBRAS_API_KEY) {
    addProvider("cerebras");
  }
  if (geminiKeys().length) {
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 제공자별 fetch에 타임아웃을 건다. 무료 제공자가 응답을 오래 끌면(행) 그 한 번의
 *  호출이 함수 전체 시간예산(maxDuration 60s)을 먹어치워 504가 나므로, 개별 호출을
 *  일정 시간에 끊고 다음 제공자로 넘어가게 한다. */
const PROVIDER_TIMEOUT_MS = Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 22000;
export async function fetchT(
  url: string,
  opts: RequestInit,
  ms = PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 전체 시간 예산(마감). maxDuration(60s)보다 여유를 둬, 이 시각을 넘기면 더 시도하지
 *  않고 깔끔한 안내(503)로 끝낸다 → Vercel 강제 종료(504·비JSON)로 화면이 깨지는 것 방지. */
const OVERALL_DEADLINE_MS = Number(process.env.AI_DEADLINE_MS) || 50000;

/** 제공자별 일시적(순간적) 실패 신호 — 같은 키로 곧바로 재시도하면 풀리는 경우가 많다.
 *  무료 등급의 분당 한도(TPM)·동시요청 제한·5xx 는 잠깐 기다리면 회복된다. */
function isTransient(detail: string): boolean {
  return /rate.?limit|too large|tokens per|\bTP[M]\b|\b429\b|\b5\d\d\b|timeout|fetch failed|ECONN|empty|비어/i.test(
    detail,
  );
}

/** 폴백 체인을 한 번 끝까지 시도한다(각 제공자/모델 순서대로). deadline을 넘기면 중단. */
async function runChainOnce(
  opts: GenOpts,
  deadline: number,
): Promise<
  | { ok: true; text: string }
  | { ok: false; detail: string; allConfigError: boolean; transient: boolean }
> {
  const chain = providerChain();
  const errors: string[] = [];
  let allConfigError = true;

  for (const { name, model, maxTokens } of chain) {
    // 시간 예산을 넘겼으면 더 시도하지 않고 종료(504 방지).
    if (Date.now() > deadline) {
      allConfigError = false;
      errors.push("시간 예산 초과 — 더 이상 제공자를 시도하지 않음");
      break;
    }
    const fn = PROVIDERS[name];
    const label = model ? `${name}(${model})` : name;
    if (!fn) {
      allConfigError = false;
      errors.push(`${label}: 알 수 없는 제공자`);
      continue;
    }
    try {
      const text = sanitizeOutput(await fn({ ...opts, model, maxTokens }));
      if (opts.valid && !opts.valid(text)) {
        allConfigError = false;
        errors.push(`${label}: 불완전 출력(잘림) → 다음 제공자로`);
        continue;
      }
      return { ok: true, text };
    } catch (err) {
      if (!(err instanceof AIConfigError)) allConfigError = false;
      errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      // 다음 제공자(또는 다음 모델)로 폴백
    }
  }
  const detail = errors.join(" | ");
  return { ok: false, detail, allConfigError, transient: isTransient(detail) };
}

/**
 * 시스템/사용자 프롬프트로 텍스트를 생성합니다.
 * 여러 제공자를 설정하면, 하나가 실패(429 토큰 초과·오류 등)할 때 다음 제공자로 자동 폴백합니다.
 * 무료 등급의 429/5xx 는 "순간적"인 경우가 많아(사용자가 새로고침 2~3번 하면 풀리는 현상),
 * 체인 전체가 일시적 사유로 실패하면 짧은 백오프 후 서버가 알아서 몇 번 더 재시도합니다.
 */
export async function generateText(opts: GenOpts): Promise<string> {
  // 체인 전체 재시도 횟수(maxDuration 60s 안에 들어오도록 보수적으로). 0,0.8s,2s,3.5s 백오프.
  const backoffs = [0, 800, 2000, 3500];
  const deadline = Date.now() + OVERALL_DEADLINE_MS;
  let last:
    | { ok: false; detail: string; allConfigError: boolean; transient: boolean }
    | undefined;

  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    // 시간 예산을 넘겼으면(다음 시도가 마감을 넘길 게 뻔하면) 중단 → 깔끔한 안내로.
    if (Date.now() > deadline) break;
    if (backoffs[attempt]) {
      // 살짝의 지터로 같은 분당창에서 동시에 몰리지 않게.
      await sleep(backoffs[attempt] + Math.floor(Math.random() * 250));
    }
    const r = await runChainOnce(opts, deadline);
    if (r.ok) return r.text;
    last = r;
    // 키 자체가 없으면(설정 문제) 재시도해도 의미 없음 → 즉시 중단.
    if (r.allConfigError) break;
    // 일시적 사유가 아니면(예: 잘못된 요청) 더 시도해도 동일 → 중단.
    if (!r.transient) break;
  }

  const detail = last?.detail || "";
  if (last?.allConfigError) {
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

/** Gemini API 키 목록. 한도는 키(프로젝트)별로 따로라 여러 개면 그만큼 일일 한도가 늘어난다.
 *  GEMINI_API_KEYS(콤마 구분) + GEMINI_API_KEY / GEMINI_API_KEY_2 / _3 ... 모두 모은다. */
function geminiKeys(): string[] {
  const raw: string[] = [];
  if (process.env.GEMINI_API_KEYS) raw.push(...process.env.GEMINI_API_KEYS.split(","));
  if (process.env.GEMINI_API_KEY) raw.push(...process.env.GEMINI_API_KEY.split(","));
  for (let i = 2; i <= 6; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k) raw.push(...k.split(","));
  }
  return Array.from(new Set(raw.map((s) => s.replace(/\s/g, "")).filter(Boolean)));
}

/**
 * AI 제공자 자가진단. 키 값은 절대 노출하지 않고, 설정 여부·개수·폴백 체인만 보고한다.
 * ping=true 면 각 제공자에 초경량 요청을 보내 실제 살아있는지(한도 소진 여부) 확인한다.
 */
export async function aiDiagnostics(ping = false): Promise<{
  configured: Record<string, number | boolean | string>;
  chain: string[];
  live?: { provider: string; ok: boolean; detail: string }[];
}> {
  const configured: Record<string, number | boolean | string> = {
    groqKeys: groqKeys().length,
    geminiKeys: geminiKeys().length,
    cerebras: !!process.env.CEREBRAS_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    ollama: !!process.env.OLLAMA_BASE_URL,
  };
  const chain = providerChain().map((e) => (e.model ? `${e.name}(${e.model})` : e.name));
  // Cerebras 키가 실제 접근 가능한 모델 목록을 조회해 진단에 포함(모델 미접근 404 원인 파악용).
  if (process.env.CEREBRAS_API_KEY) {
    const live = await fetchCerebrasModels(process.env.CEREBRAS_API_KEY);
    configured.cerebrasModels = live.length ? live.join(", ") : "(조회 실패/없음)";
  }
  if (!ping) return { configured, chain };

  // 제공자별 대표 1개만 초경량 핑(중복 모델은 생략).
  const seen = new Set<string>();
  const targets = providerChain().filter((e) => {
    if (seen.has(e.name)) return false;
    seen.add(e.name);
    return true;
  });
  const live = await Promise.all(
    targets.map(async ({ name, model }) => {
      const fn = PROVIDERS[name];
      try {
        await fn({
          system: "You are a test.",
          user: "Reply with the single word: OK",
          temperature: 0,
          model,
          // 추론(reasoning) 모델은 토큰이 적으면 본문이 비어 실패로 오판되므로 넉넉히.
          maxTokens: 64,
        });
        return { provider: model ? `${name}(${model})` : name, ok: true, detail: "OK" };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { provider: model ? `${name}(${model})` : name, ok: false, detail: msg.slice(0, 200) };
      }
    }),
  );
  return { configured, chain, live };
}

async function generateWithGemini({
  system,
  user,
  temperature = 0.4,
  model: modelOverride,
  maxTokens,
}: GenOpts): Promise<string> {
  const keys = geminiKeys();
  if (keys.length === 0) {
    throw new AIConfigError(
      "GEMINI_API_KEY 가 설정되지 않았습니다. .env.local 파일에 키를 추가하세요. (https://aistudio.google.com/apikey)",
    );
  }
  const max = maxTokens || MAX_TOKENS;
  const model = modelOverride || process.env.GEMINI_MODEL || "gemini-2.0-flash";

  // Gemma 계열 모델은 systemInstruction 필드를 지원하지 않으므로,
  // 시스템 프롬프트를 사용자 메시지 앞에 합쳐 전달한다.
  const isGemma = model.toLowerCase().includes("gemma");
  const body = JSON.stringify(
    isGemma
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
        },
  );

  let lastErr = "";
  for (const apiKey of keys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetchT(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("");
      if (!text) throw new Error("Gemini 응답이 비어 있습니다.");
      return text.trim();
    }
    const detail = await res.text();
    lastErr = `Gemini API 오류 (${res.status}): ${detail}`;
    // 429(한도 초과)·5xx만 다음 키로 재시도. 400/403 등은 키 바꿔도 동일 → 즉시 중단.
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new Error(lastErr || "Gemini 호출 실패");
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

  const res = await fetchT("https://api.anthropic.com/v1/messages", {
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
    const res = await fetchT("https://api.groq.com/openai/v1/chat/completions", {
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

/** Cerebras 모델 후보. 무료/제한 계정은 70b 접근 권한이 없어 404가 날 수 있으므로
 *  큰 모델부터 시도하고, 접근 불가(404)면 널리 열려있는 작은 모델로 폴백한다. */
function cerebrasModels(): string[] {
  const primary = process.env.CEREBRAS_MODEL || "llama-3.3-70b";
  const fallbacks = (
    process.env.CEREBRAS_FALLBACK_MODELS || "llama3.1-8b,llama-3.3-70b"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set([primary, ...fallbacks]));
}

/** 발견해 검증된 Cerebras 모델을 프로세스 수명 동안 캐시(계정별 404 탐색 반복 방지). */
let cerebrasResolvedModel: string | null = null;

/** 접근 가능한 모델 목록에서 한국어 산문 품질·비추론 우선으로 하나 고른다. */
function pickCerebrasModel(live: string[]): string | undefined {
  const prefer = [/glm/i, /qwen/i, /llama/i, /gemma/i, /mistral/i];
  return (
    prefer.map((re) => live.find((m) => re.test(m))).find(Boolean) ||
    live.find((m) => !/gpt-oss|reason/i.test(m)) ||
    live[0]
  );
}

/** 이 Cerebras 키가 실제로 접근 가능한 모델 id 목록을 조회한다(계정마다 다름).
 *  404 폴백에도 실패할 때 "무엇을 쓸 수 있는지" 알아내는 최후 수단. */
async function fetchCerebrasModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetchT("https://api.cerebras.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const ids = (data?.data || [])
      .map((m: { id?: string }) => m.id)
      .filter((s: unknown): s is string => typeof s === "string");
    return ids;
  } catch {
    return [];
  }
}

/**
 * Cerebras — 무료 등급 한도가 큼(일 100만 토큰급, 카드 불필요).
 * OpenAI 호환 API. https://cloud.cerebras.ai 에서 무료 키 발급.
 */
async function generateWithCerebras({
  system,
  user,
  temperature = 0.4,
  model: modelOverride,
  maxTokens,
}: GenOpts): Promise<string> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    throw new AIConfigError(
      "CEREBRAS_API_KEY 가 설정되지 않았습니다. https://cloud.cerebras.ai 에서 무료 키를 발급해 환경변수에 추가하세요.",
    );
  }
  const call = async (model: string) => {
    const res = await fetchT("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
    return res;
  };

  const readText = async (res: Response) => {
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Cerebras 응답이 비어 있습니다.");
    return text.trim();
  };

  // 모델 지정 시 그 모델만, 아니면 [이미 발견한 모델] + 후보들 순서대로.
  // 한 번 발견한 모델을 앞세워, 계정별 404 탐색을 반복하지 않는다.
  const models = modelOverride
    ? [modelOverride]
    : Array.from(
        new Set([
          ...(cerebrasResolvedModel ? [cerebrasResolvedModel] : []),
          ...cerebrasModels(),
        ]),
      );
  let lastErr = "";
  let had404 = false;
  for (const model of models) {
    const res = await call(model);
    if (res.ok) {
      if (!modelOverride) cerebrasResolvedModel = model; // 동작 확인된 모델 기억
      return readText(res);
    }
    const detail = await res.text();
    lastErr = `Cerebras API 오류 (${res.status}): ${detail}`;
    if (res.status === 404) had404 = true;
    // 404(모델 미접근)만 다음 모델로 폴백. 429/5xx 등은 모델 바꿔도 동일 → 중단.
    if (res.status !== 404) break;
  }
  // 후보가 전부 404(계정 미접근)면, 이 키가 실제 쓸 수 있는 모델을 조회해 한 번 더.
  if (had404 && !modelOverride) {
    const pick = pickCerebrasModel(await fetchCerebrasModels(apiKey));
    if (pick) {
      const res = await call(pick);
      if (res.ok) {
        cerebrasResolvedModel = pick; // 이후 호출부터는 바로 이 모델로.
        return readText(res);
      }
      lastErr = `Cerebras API 오류 (${res.status}, 자동선택 ${pick}): ${await res.text()}`;
    } else {
      lastErr += " | /v1/models 조회 결과 사용 가능한 모델 없음(키 권한 확인 필요)";
    }
  }
  throw new Error(lastErr || "Cerebras 호출 실패");
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

  const res = await fetchT("https://openrouter.ai/api/v1/chat/completions", {
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
    res = await fetchT(`${base}/v1/chat/completions`, {
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
  try {
    return JSON.parse(text) as T;
  } catch {
    // 약한 모델이 흔히 내는 깨짐을 보정해 한 번 더 시도한다.
    const repaired = text
      .replace(/[“”]/g, '"') // 스마트 큰따옴표 → "
      .replace(/[‘’]/g, "'") // 스마트 작은따옴표 → '
      .replace(/,(\s*[}\]])/g, "$1"); // 후행 콤마 제거
    return JSON.parse(repaired) as T;
  }
}

/**
 * 텍스트를 생성하고 JSON으로 파싱한다. 무료 모델이 깨진 JSON을 내면
 * "유효한 JSON만" 다시 요청해 자동 재시도한다(기본 1회).
 */
export async function generateJSON<T>(
  opts: GenOpts,
  retries = 1,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const o: GenOpts =
      attempt === 0
        ? opts
        : {
            ...opts,
            temperature: 0,
            user:
              opts.user +
              "\n\n★중요: 직전 출력이 '유효한 JSON'이 아니었습니다. 설명·코드블록 없이 유효한 JSON 객체만 출력하세요. 문자열 값 안에서는 큰따옴표(\")를 쓰지 말고(필요하면 작은따옴표 '로), 줄바꿈 대신 공백을 쓰세요.★",
          };
    try {
      const raw = await generateText(o);
      return parseJsonFromModel<T>(raw);
    } catch (e) {
      lastErr = e;
      // AIConfigError(키 없음)는 재시도 무의미 → 즉시 전파
      if (e instanceof AIConfigError) throw e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("JSON 생성에 실패했습니다.");
}
