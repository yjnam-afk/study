import { ImageResponse } from "next/og";

export const runtime = "edge";

/** 카카오/SNS 공유 카드용 썸네일 이미지(PNG). 한글 폰트 이슈 회피 위해 영문/도형 위주. */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 100%)",
          color: "#831843",
        }}
      >
        <div
          style={{
            width: 150,
            height: 110,
            borderRadius: 12,
            background: "white",
            marginBottom: 30,
          }}
        />
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: -2 }}>
          MELLOW SPARTA
        </div>
        <div style={{ fontSize: 36, marginTop: 16, opacity: 0.85 }}>
          info-PE study : mnemonic + answer writing
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
