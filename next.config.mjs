import fs from "node:fs";

/** @type {import('next').NextConfig} */
// 배포(빌드)마다 고유한 빌드 ID. Vercel 커밋 SHA가 있으면 그것을 쓰고,
// 없으면 prebuild가 써둔 .build-id(단일 값)를 읽는다. 이렇게 해야 클라이언트·서버
// 컴파일이 같은 값을 갖는다(각 컴파일마다 Date.now()가 달라져 오탐하던 문제 방지).
let BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || "";
if (!BUILD_ID) {
  try {
    BUILD_ID = fs.readFileSync(new URL("./.build-id", import.meta.url), "utf8").trim();
  } catch {
    /* prebuild 전(로컬 dev 등) */
  }
}
if (!BUILD_ID) BUILD_ID = String(Date.now());

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
};

export default nextConfig;
