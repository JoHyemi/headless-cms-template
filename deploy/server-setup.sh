#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CMS 시연 서버 부트스트랩 (Ubuntu 22.04 / 24.04 기준, XServer VPS·Vultr 공통)
#
# 사용법: root로 접속해서
#   bash server-setup.sh
#
# 하는 일: swap 생성 → Node 20 → PostgreSQL → Caddy → pm2 → 방화벽 → DB 준비
# 여러 번 실행해도 안전합니다(멱등).
# ---------------------------------------------------------------------------
set -euo pipefail

DB_NAME="${DB_NAME:-cms}"
DB_USER="${DB_USER:-cms}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
APP_DIR="${APP_DIR:-/srv/cms}"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
# 1. swap — RAM 2GB에서 Next.js 앱 2개를 빌드하면 OOM으로 죽습니다. 4GB 잡아둡니다.
# ---------------------------------------------------------------------------
if [ ! -f /swapfile ]; then
  log "swap 4GB 생성"
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  log "swap 이미 존재 — 건너뜀"
fi

# ---------------------------------------------------------------------------
# 2. 기본 패키지
# ---------------------------------------------------------------------------
log "apt 업데이트 및 기본 패키지 설치"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git build-essential ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https ufw

# ---------------------------------------------------------------------------
# 3. Node 20 (.nvmrc와 동일)
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  log "Node.js 20 설치"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
log "Node $(node -v) / npm $(npm -v)"

# ---------------------------------------------------------------------------
# 4. PostgreSQL — docker-compose.yml은 로컬 개발용이라 서버에는 네이티브로 설치합니다
#    (컨테이너 오버헤드 없이 2GB RAM을 아끼기 위함)
# ---------------------------------------------------------------------------
if ! command -v psql >/dev/null 2>&1; then
  log "PostgreSQL 설치"
  apt-get install -y postgresql postgresql-contrib
fi
systemctl enable --now postgresql

log "데이터베이스/계정 준비 ($DB_NAME / $DB_USER)"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
# Prisma migrate가 스키마를 만들 수 있도록 권한 부여
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# ---------------------------------------------------------------------------
# 5. Caddy — 리버스 프록시 + Let's Encrypt 인증서 자동 발급/갱신
# ---------------------------------------------------------------------------
if ! command -v caddy >/dev/null 2>&1; then
  log "Caddy 설치"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
fi

# ---------------------------------------------------------------------------
# 6. pm2
# ---------------------------------------------------------------------------
if ! command -v pm2 >/dev/null 2>&1; then
  log "pm2 설치"
  npm install -g pm2
  pm2 startup systemd -u root --hp /root >/dev/null
fi

# ---------------------------------------------------------------------------
# 7. 방화벽 — 22/80/443만 열고 앱 포트(3000/3001/4000)는 외부에 노출하지 않습니다.
#    Caddy만 앱에 접근하면 되므로 localhost 통신으로 충분합니다.
# ---------------------------------------------------------------------------
log "방화벽 설정"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ---------------------------------------------------------------------------
# 8. 앱 디렉터리
# ---------------------------------------------------------------------------
mkdir -p "$APP_DIR"

cat <<EOF

============================================================
 서버 준비 완료
============================================================
 DATABASE_URL 로 쓸 값 (반드시 복사해두세요):

   postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME

 다음 순서로 진행하세요:
   1) git clone <repo> $APP_DIR
   2) deploy/DEPLOY.md 의 "3. 환경변수" 대로 .env 3개 작성
   3) bash deploy/deploy.sh
============================================================

EOF
