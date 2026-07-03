import { NextRequest, NextResponse } from "next/server";
import { Mp3Encoder } from "@breezystack/lamejs";
import { cached, hashKey } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 🎙️ 신경망 TTS — Gemini 멀티스피커 음성합성.
 * 팟캐스트 대본(진행자/전문가)을 "두 명의 진짜 사람 목소리"로 한 번에 합성한다.
 * 브라우저 내장 TTS(기계음)를 대체. 결과 mp3는 Redis에 30일 캐시해
 * 재생할 때마다 API를 다시 부르지 않는다.
 */

const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";

/** PCM(s16le) → mp3(mono 48kbps). 5~6MB PCM이 ~700KB로 줄어 캐시 가능해진다. */
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

async function synthesize(script: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 미설정");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        parts: [
          {
            text:
              "다음은 한국어 학습 팟캐스트 대화입니다. 두 사람이 자연스럽고 생기있게, 적당한 속도로 대화하듯 읽어주세요.\n\n" +
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
            {
              speaker: "진행자",
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
            {
              speaker: "전문가",
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } },
            },
          ],
        },
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini TTS 오류 (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data,
  );
  const b64 = part?.inlineData?.data as string | undefined;
  if (!b64) throw new Error("TTS 응답에 오디오가 없습니다.");
  const mime = (part?.inlineData?.mimeType as string) || "audio/L16;rate=24000";
  const rate = Number(mime.match(/rate=(\d+)/)?.[1] || 24000);
  const pcm = Buffer.from(b64, "base64");
  const mp3 = pcmToMp3(pcm, rate);
  return mp3.toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const { script } = (await req.json()) as { script: string };
    if (!script?.trim() || script.length > 4000) {
      return NextResponse.json({ error: "대본이 없거나 너무 깁니다." }, { status: 400 });
    }

    // mp3 base64 캐시: Upstash 요청 상한(1MB)에 맞게 ~950KB까지만 저장.
    const mp3b64 = await cached(
      `tts:v1:${hashKey(script)}`,
      30 * 86400,
      () => synthesize(script),
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
