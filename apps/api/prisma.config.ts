import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7からデータベース接続情報はschema.prismaではなく、
// この設定ファイルで管理します。(Prisma Migrate/CLI専用の設定 — 実際のアプリ実行時の
// DB接続はprisma.service.tsがprocess.env.DATABASE_URLを直接読んで別途確立します。)
//
// env("DATABASE_URL")(prisma/configが提供するヘルパー)は値がないと設定ファイルを読み込む
// 時点で即座に例外を投げる — `prisma generate`のようにDBに実際は接続しないコマンドも
// apps/api/.envがまだないと問答無用で失敗する(CIの最初のビルド、`npm install`直後で
// まだ.envを作っていない場合など)。代わりに素朴なfallbackを使い、.envがあればその
// 値を、なければdocker-compose.ymlのデフォルト値と同じダミー値を使うようにする。
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://cms:cms@localhost:5432/cms",
  },
});
