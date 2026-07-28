import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7부터 데이터베이스 연결 정보는 schema.prisma가 아닌
// 이 설정 파일에서 관리합니다. (Prisma Migrate/CLI 전용 설정 — 실제 앱 실행 시의
// DB 연결은 prisma.service.ts가 process.env.DATABASE_URL을 직접 읽어서 따로 맺습니다.)
//
// env("DATABASE_URL")(prisma/config가 제공하는 헬퍼)는 값이 없으면 설정 파일을 읽는
// 시점에 즉시 예외를 던진다 — `prisma generate`처럼 DB에 실제로 접속하지 않는 명령도
// apps/api/.env가 아직 없으면 무조건 실패한다(CI 최초 빌드, `npm install` 직후
// 순서상 .env를 아직 안 만든 경우 등). 대신 일반 fallback을 써서, .env가 있으면 그
// 값을, 없으면 docker-compose.yml 기본값과 동일한 더미 값을 사용하도록 한다.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://cms:cms@localhost:5432/cms",
  },
});
