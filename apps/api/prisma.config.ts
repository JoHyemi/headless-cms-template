import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7부터 데이터베이스 연결 정보는 schema.prisma가 아닌
// 이 설정 파일에서 관리합니다. (Prisma Migrate/CLI 전용 설정)
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
});
