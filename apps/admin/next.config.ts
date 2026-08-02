import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cms/ui"],
  // モノレポルート(cms/)をワークスペースルートとして固定します。このアプリのディレクトリだけに
  // 絞ると、npm workspacesがルートnode_modulesにホイスティングしたパッケージ(next含む)を見つけられません。
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  // API_PROXY_TARGETが設定されている場合のみ有効(deploy/local-demo.sh専用)。
  // admin/apiを別々のcloudflaredトンネル(=別ドメイン)で公開すると、apiが発行するセッション
  // クッキーはapiのドメインにしか保存されず、admin自身のサーバー側(proxy.tsのミドルウェア認証
  // チェック・serverApiFetchのクッキー転送)からは見えなくなりログインが機能しない。
  // ここでadminサーバー自身に/api-proxy/*としてapiへのリバースプロキシを持たせ、ブラウザからは
  // 常にadminの自ドメインだけを叩かせることで、クッキーがadminのドメインに乗るようにする
  // (通常デプロイではAPI_PROXY_TARGETを設定しないため、このrewriteは無効のまま)。
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    if (!target) return [];
    return [{ source: "/api-proxy/:path*", destination: `${target}/:path*` }];
  },
};

export default nextConfig;
