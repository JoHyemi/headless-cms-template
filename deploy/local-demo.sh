#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# 대면 시연용: 로컬에서 프로덕션 빌드로 3개 앱을 띄우고, cloudflared 터널로
# website/admin에 접속 가능한 https URL을 발급합니다.
#
# 반드시 본인 노트북(맥) 터미널에서 직접 실행하세요 — 원격 샌드박스가 아니라
# "지금 이 자리에서" 인터넷에 연결된 컴퓨터여야 터널이 의미가 있습니다.
#
#   cd cms
#   bash deploy/local-demo.sh
#
# 끝나면 deploy/local-demo-stop.sh 로 정리하세요.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
LOG_DIR="$ROOT/deploy/.logs"
PID_FILE="$ROOT/deploy/.demo-pids"
mkdir -p "$LOG_DIR"
: > "$PID_FILE"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$1"; }
die()  { printf '\033[1;31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

track_pid() { echo "$1" >> "$PID_FILE"; }

# ---------------------------------------------------------------------------
# 0. 사전 점검
# ---------------------------------------------------------------------------
command -v docker  >/dev/null 2>&1 || die "docker가 없습니다. Docker Desktop을 먼저 켜세요."
command -v npm     >/dev/null 2>&1 || die "npm이 없습니다."

if ! command -v cloudflared >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    log "cloudflared 설치 (brew)"
    brew install cloudflared
  else
    die "cloudflared가 없습니다. 'brew install cloudflared' 로 설치 후 다시 실행하세요."
  fi
fi

[ -f apps/api/.env ] || die "apps/api/.env 가 없습니다. .env.example을 복사해 먼저 채워두세요."

# ---------------------------------------------------------------------------
# 1. 로컬 Postgres
# ---------------------------------------------------------------------------
log "로컬 Postgres 기동"
docker compose up -d db

log "Postgres healthy 대기"
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U "${POSTGRES_USER:-cms}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  [ "$i" -eq 30 ] && die "Postgres가 30초 안에 준비되지 않았습니다. 'docker compose logs db' 확인하세요."
done

# ---------------------------------------------------------------------------
# 2. 빌드 (공유 패키지 → api)
# ---------------------------------------------------------------------------
log "@cms/blocks 빌드"
npm run build -w @cms/blocks

log "Prisma 클라이언트 생성 + 마이그레이션 적용"
npm run prisma:generate -w @cms/api
(cd apps/api && npx prisma migrate deploy)

log "api 빌드"
npm run build -w @cms/api

log "관리자 계정 시드 (이미 있으면 건너뜀)"
npm run db:seed -w @cms/api || warn "시드 건너뜀 (이미 실행되었을 수 있습니다)"

# ---------------------------------------------------------------------------
# 3. api 기동 — 오늘 하루만 쿠키/CORS를 터널 환경에 맞게 인라인으로 완화합니다.
#    .env 파일은 건드리지 않습니다(이 값들은 프로세스 종료와 함께 사라짐).
#      - COOKIE_SAME_SITE=none : admin과 api가 서로 다른 터널 도메인이라
#        sameSite=lax(기본값)면 로그인 후 세션 쿠키가 admin→api 요청에 안 실립니다.
#      - CORS_ORIGINS=""       : 터널 URL은 매번 랜덤이라 미리 CORS 허용 목록에
#        넣어둘 수 없습니다. 비워두면 main.ts가 요청 Origin을 그대로 반사 허용합니다.
# ---------------------------------------------------------------------------
log "api 기동 (포트 4000)"
(cd apps/api && COOKIE_SAME_SITE=none CORS_ORIGINS="" PORT=4000 node dist/main.js) \
  > "$LOG_DIR/api.log" 2>&1 &
API_PID=$!
track_pid "$API_PID"

log "api 응답 대기"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/ || echo 000)
  [ "$code" != "000" ] && break
  sleep 1
  [ "$i" -eq 30 ] && die "api가 30초 안에 응답하지 않습니다. $LOG_DIR/api.log 확인하세요."
done

# ---------------------------------------------------------------------------
# 4. api 터널 — admin/website 빌드에 이 URL을 박아 넣어야 하므로 가장 먼저 엽니다.
# ---------------------------------------------------------------------------
wait_for_tunnel_url() {
  local logfile="$1" waited=0
  while [ "$waited" -lt 30 ]; do
    url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$logfile" 2>/dev/null | head -n1 || true)
    [ -n "${url:-}" ] && { echo "$url"; return 0; }
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

log "api 터널 오픈"
cloudflared tunnel --url http://localhost:4000 > "$LOG_DIR/tunnel-api.log" 2>&1 &
track_pid "$!"
API_URL_PUBLIC=$(wait_for_tunnel_url "$LOG_DIR/tunnel-api.log") \
  || die "api 터널 URL을 못 받았습니다. $LOG_DIR/tunnel-api.log 확인하세요."
log "api 공개 URL: $API_URL_PUBLIC"

# ---------------------------------------------------------------------------
# 5. admin/website에 api 터널 URL 주입 후 빌드
#    .env.production.local은 next build(NODE_ENV=production) 시 .env.local보다
#    우선 적용되어 브라우저 번들에 이 값이 박힙니다.
# ---------------------------------------------------------------------------
log "admin/website 환경변수 작성"
cat > apps/admin/.env.production.local <<EOF
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=$API_URL_PUBLIC
EOF
cat > apps/website/.env.production.local <<EOF
NEXT_PUBLIC_API_URL=$API_URL_PUBLIC
EOF

log "admin 빌드"
npm run build -w @cms/admin

log "website 빌드"
npm run build -w @cms/website

# ---------------------------------------------------------------------------
# 6. admin/website 기동
# ---------------------------------------------------------------------------
log "admin 기동 (포트 3001)"
npm run start -w @cms/admin > "$LOG_DIR/admin.log" 2>&1 &
track_pid "$!"

log "website 기동 (포트 3000)"
npm run start -w @cms/website > "$LOG_DIR/website.log" 2>&1 &
track_pid "$!"

for port in 3001 3000; do
  for i in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$port/" || echo 000)
    [ "$code" != "000" ] && break
    sleep 1
    [ "$i" -eq 30 ] && die "포트 $port 가 30초 안에 응답하지 않습니다. 로그를 확인하세요."
  done
done

# ---------------------------------------------------------------------------
# 7. admin/website 터널
# ---------------------------------------------------------------------------
log "admin 터널 오픈"
cloudflared tunnel --url http://localhost:3001 > "$LOG_DIR/tunnel-admin.log" 2>&1 &
track_pid "$!"
ADMIN_URL_PUBLIC=$(wait_for_tunnel_url "$LOG_DIR/tunnel-admin.log") \
  || die "admin 터널 URL을 못 받았습니다. $LOG_DIR/tunnel-admin.log 확인하세요."

log "website 터널 오픈"
cloudflared tunnel --url http://localhost:3000 > "$LOG_DIR/tunnel-website.log" 2>&1 &
track_pid "$!"
WEBSITE_URL_PUBLIC=$(wait_for_tunnel_url "$LOG_DIR/tunnel-website.log") \
  || die "website 터널 URL을 못 받았습니다. $LOG_DIR/tunnel-website.log 확인하세요."

ADMIN_EMAIL=$(grep -E '^ADMIN_EMAIL=' apps/api/.env | cut -d= -f2- | tr -d '"')

cat <<EOF

============================================================
 시연 준비 완료 — 아래 두 URL만 쓰면 됩니다
============================================================
 공개 사이트: $WEBSITE_URL_PUBLIC
 관리자 화면: $ADMIN_URL_PUBLIC   (로그인: $ADMIN_EMAIL / apps/api/.env의 ADMIN_PASSWORD)

 주의:
 - 이 URL들은 이 스크립트를 켜둔 동안만 살아 있습니다. 노트북을 재우거나
   터미널을 닫으면 끊깁니다.
 - 링크는 참가자에게 QR코드나 채팅으로 공유하세요. 매번 랜덤이라 재시작하면
   URL이 바뀝니다.
 - 끝나면:  bash deploy/local-demo-stop.sh
============================================================

EOF
