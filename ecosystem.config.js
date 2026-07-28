// pm2プロセスマネージャー用の設定(実際のデプロイサーバーで使用)。ローカル開発には不要です —
// ローカルでは`npm run dev`(concurrently)で3つのアプリを同時に実行します。
module.exports = {
  apps: [
    {
      name: "cms-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      env: { NODE_ENV: "production" },
    },
    {
      name: "cms-admin",
      cwd: "./apps/admin",
      // npm workspacesがnextをモノレポルートにホイスティングするため、apps/admin/node_modules/.bin/nextは
      // 存在しません。ルートにインストールされた実際のエントリーポイントを直接指定しないとpm2が起動しません。
      script: "../../node_modules/next/dist/bin/next",
      args: "start -p 3001",
      env: { NODE_ENV: "production" },
    },
    {
      name: "cms-website",
      cwd: "./apps/website",
      script: "../../node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production" },
    },
  ],
};
