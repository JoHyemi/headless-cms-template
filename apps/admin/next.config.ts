import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cms/ui"],
  // モノレポルート(cms/)をワークスペースルートとして固定します。このアプリのディレクトリだけに
  // 絞ると、npm workspacesがルートnode_modulesにホイスティングしたパッケージ(next含む)を見つけられません。
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
