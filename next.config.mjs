/** @type {import('next').NextConfig} */
// 배포(빌드)마다 고유한 빌드 ID. Vercel 커밋 SHA가 있으면 그것을, 없으면 빌드 시각.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
};

export default nextConfig;
