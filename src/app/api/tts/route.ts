import { NextRequest, NextResponse } from "next/server";
import { Mp3Encoder } from "@breezystack/lamejs";
import { cached, hashKey } from "@/lib/cache";
import { edgeSynthesize, EDGE_VOICES } from "@/lib/edgetts";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 🎙️ 신경망 TTS — 팟캐스트 대본을 진짜 사람 같은 두 목소리 mp3로 합성.
 * 1순위 Edge 신경망(무료·키 불필요, 선히/인준), 2순위 Gemini 멀티스피커.
 * 결과 mp3는 Redis 30일 캐시(재생마다 재합성하지 않음).
 */

type Turn = { speaker: "진행자" | "전문가"; text: string };

function parseTurns(script: string): Turn[] {
  const turns: Turn[] = [];
  for (const line of script.split("\n")) {
    const m = line.trim().match(/^(진행자|전문가)\s*[:：]\s*(.+)$/);
    if (m) turns.push({ speaker: m[1] as Turn["speaker"], text: m[2].trim() });
  }
  return turns;
}

/** Edge 신경망: 턴별로 화자 보이스로 합성해 mp3 프레임을 이어붙인다. */
async function synthesizeEdge(script: string): Promise<Buffer> {
  const turns = parseTurns(script);
  if (!turns.length) throw new Error("대본에 대사가 없습니다.");
  const parts: Buffer[] = [];
  for (const t of turns) {
    const isHost = t.speaker === "진행자";
    const buf = await edgeSynthesize(
      t.text,
      isHost ? EDGE_VOICES.host : EDGE_VOICES.expert,
      { rate: isHost ? "+8%" : "+4%", pauseMs: 350 },
    );
    parts.push(buf);
  }
  return Buffer.concat(parts);
}

/**
 * Google Cloud TTS(Neural2) — 월 100만 자 무료, 한국어 음질 최상급.
 * GOOGLE_TTS_API_KEY 환경변수만 등록하면 1순위로 사용된다.
 * 진행자 ko-KR-Neural2-A(여), 전문가 ko-KR-Neural2-C(남).
 */
async function synthesizeGoogle(script: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY 미설정");
  const turns = parseTurns(script);
  if (!turns.length) throw new Error("대본에 대사가 없습니다.");
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const parts: Buffer[] = [];
  for (const t of turns) {
    const isHost = t.speaker === "진행자";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: t.text },
        voice: {
          languageCode: "ko-KR",
          name: isHost ? "ko-KR-Neural2-A" : "ko-KR-Neural2-C",
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: isHost ? 1.08 : 1.02,
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Google TTS (${res.status}): ${detail.slice(0, 200)}`);
    }
    const data = await res.json();
    if (!data.audioContent) throw new Error("Google TTS 응답에 오디오 없음");
    parts.push(Buffer.from(data.audioContent as string, "base64"));
  }
  return Buffer.concat(parts);
}

/**
 * Pollinations 무료 TTS — 무가입·무키. OpenAI 신경망 목소리(nova/onyx)로
 * 한국어를 자연스럽게 읽는다. 커뮤니티 무료 프록시라 간헐 실패 가능 → 폴백 체인으로 흡수.
 */
async function synthesizePollinations(script: string): Promise<Buffer> {
  const turns = parseTurns(script);
  if (!turns.length) throw new Error("대본에 대사가 없습니다.");

  const synthOne = async (t: Turn): Promise<Buffer> => {
    const isHost = t.speaker === "진행자";
    const voice = isHost ? "nova" : "onyx";
    const prompt =
      "다음 문장을 한 글자도 바꾸지 말고, 자연스러운 한국어 발음으로 그대로 읽어줘: " +
      t.text;
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai-audio&voice=${voice}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25_000);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      const type = res.headers.get("content-type") || "";
      if (!res.ok || !type.includes("audio")) {
        const detail = type.includes("audio") ? "" : (await res.text()).slice(0, 120);
        throw new Error(`Pollinations (${res.status}) ${detail}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) throw new Error("Pollinations 빈 오디오");
      return buf;
    } finally {
      clearTimeout(timer);
    }
  };

  // 턴이 많으면 60초 안에 끝나도록 4개씩 병렬 합성(순서는 인덱스로 보존).
  const parts: Buffer[] = new Array(turns.length);
  for (let i = 0; i < turns.length; i += 4) {
    const batch = turns.slice(i, i + 4);
    const bufs = await Promise.all(batch.map(synthOne));
    bufs.forEach((b, j) => (parts[i + j] = b));
  }
  return Buffer.concat(parts);
}

/**
 * ElevenLabs TTS — 무료 가입(카드 불필요) 월 1만 자. 음질 최상급(다국어 v2).
 * ELEVENLABS_API_KEY 등록 시 사용. 진행자/전문가 보이스는 env로 교체 가능.
 */
async function synthesizeElevenLabs(script: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY 미설정");
  const turns = parseTurns(script);
  if (!turns.length) throw new Error("대본에 대사가 없습니다.");
  // 무료 API는 구형(라이브러리) 보이스 사용 불가(402) → 현행 기본 premade 보이스 사용.
  const hostVoice = process.env.ELEVENLABS_VOICE_HOST || "EXAVITQu4vr4xnSDxMaL"; // Sarah(여)
  const expertVoice =
    process.env.ELEVENLABS_VOICE_EXPERT || "nPczCjzI2devNBz1zQrb"; // Brian(남)
  const parts: Buffer[] = [];
  for (const t of turns) {
    const voice = t.speaker === "진행자" ? hostVoice : expertVoice;
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t.text,
          model_id: "eleven_multilingual_v2",
        }),
      },
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`ElevenLabs (${res.status}): ${detail.slice(0, 150)}`);
    }
    parts.push(Buffer.from(await res.arrayBuffer()));
  }
  return Buffer.concat(parts);
}

const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";

function pcmToMp3(pcm: Buffer, sampleRate: number): Buffer {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 2);
  const enc = new Mp3Encoder(1, sampleRate, 48);
  const out: Uint8Array[] = [];
  const CHUNK = 1152;
  for (let i = 0; i < samples.length; i += CHUNK) {
    const d = enc.encodeBuffer(samples.subarray(i, i + CHUNK));
    if (d.length) out.push(new Uint8Array(d));
  }
  const end = enc.flush();
  if (end.length) out.push(new Uint8Array(end));
  return Buffer.concat(out);
}

/** Gemini 멀티스피커(프로젝트에 TTS 권한이 있을 때만 성공). */
async function synthesizeGemini(script: string): Promise<Buffer> {
  // 기존 프로젝트가 TTS 접근 거부(403)라, 새 무료 키를 GEMINI_TTS_API_KEY로
  // 따로 등록하면 그 키를 우선 사용한다(본문 생성 키와 분리).
  const apiKey = process.env.GEMINI_TTS_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 미설정");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                "다음은 한국어 학습 팟캐스트 대화입니다. 두 사람이 자연스럽고 생기있게 읽어주세요.\n\n" +
                script,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: "진행자", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
              { speaker: "전문가", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } },
            ],
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini TTS (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data,
  );
  if (!part?.inlineData?.data) throw new Error("TTS 응답에 오디오 없음");
  const rate = Number(
    (part.inlineData.mimeType || "").match(/rate=(\d+)/)?.[1] || 24000,
  );
  return pcmToMp3(Buffer.from(part.inlineData.data, "base64"), rate);
}

/** 진단용: 어떤 TTS 키가 서버에 "실제로" 반영돼 있는지 확인(값은 노출 안 함). */
export async function GET() {
  return NextResponse.json({
    providers: {
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      google_tts: !!process.env.GOOGLE_TTS_API_KEY,
      gemini_tts_key: !!process.env.GEMINI_TTS_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { script } = (await req.json()) as { script: string };
    if (!script?.trim() || script.length > 4000) {
      return NextResponse.json({ error: "대본이 없거나 너무 깁니다." }, { status: 400 });
    }

    const mp3b64 = await cached(
      `tts:v3:${hashKey(script)}`,
      90 * 86400,
      async () => {
        // 폴백 체인(전부 무료): Google(키 있으면) → Gemini(새 TTS 키 지원)
        // → Pollinations(무가입) → Edge. 되는 첫 번째 것을 사용.
        const errors: string[] = [];
        const providers: [string, () => Promise<Buffer>][] = [
          ...(process.env.GOOGLE_TTS_API_KEY
            ? ([["google", () => synthesizeGoogle(script)]] as [
                string,
                () => Promise<Buffer>,
              ][])
            : []),
          // ElevenLabs: 무료 API는 영어 원어민 보이스뿐이라 한국어가 어색(섬찟)함.
          // 한국어 보이스 ID를 명시(env)했을 때만 체인에 포함한다.
          ...(process.env.ELEVENLABS_API_KEY &&
          (process.env.ELEVENLABS_VOICE_HOST ||
            process.env.ELEVENLABS_VOICE_EXPERT)
            ? ([["elevenlabs", () => synthesizeElevenLabs(script)]] as [
                string,
                () => Promise<Buffer>,
              ][])
            : []),
          ["gemini", () => synthesizeGemini(script)],
          ["pollinations", () => synthesizePollinations(script)],
          ["edge", () => synthesizeEdge(script)],
        ];
        for (const [name, fn] of providers) {
          try {
            return (await fn()).toString("base64");
          } catch (e) {
            errors.push(`${name}: ${e instanceof Error ? e.message : "실패"}`);
          }
        }
        throw new Error(errors.join(" / "));
      },
      (v) => typeof v === "string" && v.length > 2000 && v.length < 1_250_000,
    );

    return NextResponse.json({ audio: mp3b64, mime: "audio/mpeg" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TTS 실패";
    const rateLimited = /429|quota|RESOURCE_EXHAUSTED/i.test(msg);
    return NextResponse.json(
      {
        error: rateLimited
          ? "오늘의 고품질 음성 생성 한도를 다 썼어요. 기본 음성으로 재생할게요."
          : msg,
      },
      { status: rateLimited ? 429 : 500 },
    );
  }
}
