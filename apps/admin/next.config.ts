import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cms/ui"],
  // 모노레포 루트(cms/)를 워크스페이스 루트로 고정합니다. 이 앱 디렉터리로만 좁히면
  // npm workspaces가 루트 node_modules에 호이스팅한 패키지(next 포함)를 찾지 못합니다.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
