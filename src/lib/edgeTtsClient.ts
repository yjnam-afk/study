/**
 * 브라우저에서 "직접" Microsoft Edge 신경망 TTS를 호출한다(무료·키 불필요).
 *
 * 서버(Vercel 등 클라우드 IP)는 MS가 403으로 차단하지만, 사용자 브라우저의
 * 일반(가정/모바일) IP는 차단되지 않는다 → 클라이언트 직결이 유일한 무료 경로.
 * 인증은 5분 창 SHA-256 서명(Sec-MS-GEC)을 WebCrypto로 생성한다.
 */

const TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const CHROME_VER = "130.0.2849.68";

export const EDGE_CLIENT_VOICES = {
  host: "ko-KR-SunHiNeural", // 진행자(여)
  expert: "ko-KR-InJoonNeural", // 전문가(남)
} as const;

async function genSecMsGec(): Promise<string> {
  let ticks = Math.floor(Date.now() / 1000) + 11644473600;
  ticks -= ticks % 300;
  const data = new TextEncoder().encode(`${ticks * 10_000_000}${TRUSTED_TOKEN}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 한 문단을 지정 보이스로 합성해 mp3 바이트를 돌려준다. */
export async function edgeSynthesizeBrowser(
  text: string,
  voice: string,
  opts?: { rate?: string; pauseMs?: number },
): Promise<Uint8Array> {
  const gec = await genSecMsGec();
  const connId = crypto.randomUUID().replace(/-/g, "");
  const url =
    `${WSS_URL}?TrustedClientToken=${TRUSTED_TOKEN}` +
    `&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=1-${CHROME_VER}&ConnectionId=${connId}`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    const chunks: Uint8Array[] = [];
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Edge TTS 시간 초과"));
    }, 20_000);

    const ts = () => new Date().toString();

    ws.onopen = () => {
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
      const pause = opts?.pauseMs ? `<break time='${opts.pauseMs}ms'/>` : "";
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'>` +
        `<voice name='${voice}'><prosody pitch='+0Hz' rate='${rate}' volume='+0%'>` +
        `${escapeXml(text)}${pause}</prosody></voice></speak>`;
      ws.send(
        `X-RequestId:${connId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts()}\r\nPath:ssml\r\n\r\n` +
          ssml,
      );
    };

    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data === "string") {
        if (ev.data.includes("Path:turn.end")) {
          clearTimeout(timeout);
          ws.close();
          const total = chunks.reduce((n, c) => n + c.length, 0);
          if (total < 200) {
            reject(new Error("Edge TTS 빈 응답"));
            return;
          }
          const out = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) {
            out.set(c, off);
            off += c.length;
          }
          resolve(out);
        }
        return;
      }
      const buf = ev.data as ArrayBuffer;
      const dv = new DataView(buf);
      const headerLen = dv.getUint16(0);
      const header = new TextDecoder().decode(
        new Uint8Array(buf, 2, headerLen),
      );
      if (header.includes("Path:audio")) {
        chunks.push(new Uint8Array(buf, 2 + headerLen));
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Edge TTS 연결 실패(브라우저)"));
    };
  });
}

/** 팟캐스트 턴 목록을 화자별 보이스로 합성해 하나의 mp3 Blob으로 만든다. */
export async function edgeSynthesizeTurnsBrowser(
  turns: { speaker: "진행자" | "전문가"; text: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const parts: Uint8Array[] = new Array(turns.length);
  let done = 0;
  // 3개씩 병렬(순서는 인덱스로 보존) — 과도한 동시 연결로 차단되지 않게.
  for (let i = 0; i < turns.length; i += 3) {
    const batch = turns.slice(i, i + 3);
    const bufs = await Promise.all(
      batch.map((t) => {
        const isHost = t.speaker === "진행자";
        return edgeSynthesizeBrowser(
          t.text,
          isHost ? EDGE_CLIENT_VOICES.host : EDGE_CLIENT_VOICES.expert,
          { rate: isHost ? "+8%" : "+4%", pauseMs: 350 },
        );
      }),
    );
    bufs.forEach((b, j) => (parts[i + j] = b));
    done += batch.length;
    onProgress?.(done, turns.length);
  }
  return new Blob(parts as BlobPart[], { type: "audio/mpeg" });
}
