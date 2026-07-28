#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# 배포 스크립트 — 서버의 /srv/cms 에서 실행합니다.
#
#   cd /srv/cms && bash deploy/deploy.sh
#
# .env 파일 3개가 미리 작성되어 있어야 합니다 (deploy/DEPLOY.md 참고).
# NEXT_PUBLIC_* 값은 빌드 시점에 번들에 박히므로, .env를 고쳤다면
# 반드시 이 스크립트를 다시 돌려서 재빌드해야 반영됩니다.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."
log() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

for f in apps/api/.env apps/admin/.env.production apps/website/.env.production; do
  if [ ! -f "$f" ]; then
    echo "ERROR: $f 가 없습니다. deploy/DEPLOY.md 의 '3. 환경변수'를 먼저 진행하세요." >&2
    exit 1
  fi
done

log "의존성 설치"
npm ci

log "공유 패키지 빌드"
npm run build -w @cms/blocks

log "Prisma 클라이언트 생성 + 마이그레이션"
npm run prisma:generate -w @cms/api
# package.json의 prisma:migrate는 `migrate dev`(개발용, 대화형)이므로 프로덕션에서는 쓰지 않습니다.
# apps/api 안에서 실행해야 prisma.config.ts가 같은 폴더의 .env를 읽습니다.
(cd apps/api && npx prisma migrate deploy)

log "API 빌드"
npm run build -w @cms/api

# Next.js 빌드는 메모리를 많이 씁니다. 2GB VPS에서는 반드시 순차로 돌립니다.
log "admin 빌드"
NODE_OPTIONS="--max-old-space-size=1536" npm run build -w @cms/admin

log "website 빌드"
NODE_OPTIONS="--max-old-space-size=1536" npm run build -w @cms/website

log "관리자 계정 시드 (이미 있으면 건너뜀)"
npm run db:seed -w @cms/api || echo "시드 건너뜀 (이미 실행되었을 수 있습니다)"

log "pm2 기동"
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save

log "완료"
pm2 status
