/**
 * Microsoft Edge 신경망 TTS (무료·API 키 불필요).
 * Edge 브라우저의 "소리내어 읽기"가 쓰는 공개 엔드포인트를 직접 호출한다.
 * 한국어 신경망 보이스: ko-KR-SunHiNeural(여) / ko-KR-InJoonNeural(남) —
 * 브라우저 내장 TTS와 차원이 다른 자연스러운 음질.
 *
 * 인증: TrustedClientToken + Sec-MS-GEC(5분 창 단위 SHA256 서명) — 서명이
 * 없으면 403이 나므로 직접 생성한다(edge-tts 프로젝트에 공개된 방식).
 */
import { createHash, randomUUID } from "crypto";
import WebSocket from "ws";

const TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const CHROME_VER = "130.0.2849.68";

/** Sec-MS-GEC: 윈도우 파일타임(5분 창 내림) + 토큰의 SHA256 대문자 서명. */
function genSecMsGec(): string {
  let ticks = Math.floor(Date.now() / 1000) + 11644473600;
  ticks -= ticks % 300; // 5분 창
  const str = `${ticks * 10_000_000}${TRUSTED_TOKEN}`;
  return createHash("sha256").update(str, "ascii").digest("hex").toUpperCase();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 한 문단을 지정 보이스로 합성해 mp3 Buffer를 돌려준다. */
export function edgeSynthesize(
  text: string,
  voice: string,
  opts?: { rate?: string; pitch?: string; pauseMs?: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const gec = genSecMsGec();
    const connId = randomUUID().replace(/-/g, "");
    const url =
      `${WSS_URL}?TrustedClientToken=${TRUSTED_TOKEN}` +
      `&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=1-${CHROME_VER}&ConnectionId=${connId}`;

    // 샌드박스/프록시 환경 지원(HTTPS_PROXY 있으면 경유). Vercel에선 직접 연결.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let agent: any;
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    if (proxy) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { HttpsProxyAgent } = require("https-proxy-agent");
      agent = new HttpsProxyAgent(proxy);
    }

    const ws = new WebSocket(url, {
      agent,
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "User-Agent":
          `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
          `(KHTML, like Gecko) Chrome/${CHROME_VER.split(".")[0]}.0.0.0 Safari/537.36 Edg/${CHROME_VER}`,
      },
    });

    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error("Edge TTS 시간 초과"));
    }, 30_000);

    const ts = () => new Date().toString();

    ws.on("open", () => {
      ws.send(
        `X-Timestamp:${ts()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "false",
                  },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                },
              },
            },
          }),
      );
      const rate = opts?.rate || "+6%";
      const pitch = opts?.pitch || "+0Hz";
      const pause = opts?.pauseMs ? `<break time='${opts.pauseMs}ms'/>` : "";
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'>` +
        `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='+0%'>` +
        `${escapeXml(text)}${pause}</prosody></voice></speak>`;
      ws.send(
        `X-RequestId:${connId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts()}\r\nPath:ssml\r\n\r\n` +
          ssml,
      );
    });

    ws.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        // [2바이트 헤더길이][헤더][오디오] — Path:audio 프레임만 수집
        const headerLen = data.readUInt16BE(0);
        const header = data.subarray(2, 2 + headerLen).toString("utf8");
        if (header.includes("Path:audio")) {
          chunks.push(data.subarray(2 + headerLen));
        }
      } else {
        const text = data.toString("utf8");
        if (text.includes("Path:turn.end")) {
          clearTimeout(timeout);
          ws.close();
          const buf = Buffer.concat(chunks);
          if (buf.length < 200) reject(new Error("Edge TTS 빈 응답"));
          else resolve(buf);
        }
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`Edge TTS 연결 오류: ${err.message}`));
    });
    ws.on("close", (code) => {
      clearTimeout(timeout);
      if (!chunks.length) reject(new Error(`Edge TTS 종료(code ${code})`));
    });
  });
}

export const EDGE_VOICES = {
  host: "ko-KR-SunHiNeural", // 진행자(여) — 밝고 또렷
  expert: "ko-KR-InJoonNeural", // 전문가(남) — 차분한 설명 톤
} as const;
