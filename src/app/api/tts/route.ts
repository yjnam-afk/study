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
  const apiKey = process.env.GEMINI_API_KEY;
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

export async function POST(req: NextRequest) {
  try {
    const { script } = (await req.json()) as { script: string };
    if (!script?.trim() || script.length > 4000) {
      return NextResponse.json({ error: "대본이 없거나 너무 깁니다." }, { status: 400 });
    }

    const mp3b64 = await cached(
      `tts:v2:${hashKey(script)}`,
      30 * 86400,
      async () => {
        // Edge(무료·고품질) 먼저, 안 되면 Gemini.
        try {
          return (await synthesizeEdge(script)).toString("base64");
        } catch (e) {
          const edgeErr = e instanceof Error ? e.message : "edge 실패";
          try {
            return (await synthesizeGemini(script)).toString("base64");
          } catch (g) {
            const gemErr = g instanceof Error ? g.message : "gemini 실패";
            throw new Error(`${edgeErr} / ${gemErr}`);
          }
        }
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
