#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CMSデモサーバーのブートストラップ(Ubuntu 22.04 / 24.04基準、XServer VPS・Vultr共通)
#
# 使い方: rootで接続して
#   bash server-setup.sh
#
# やること: swap作成 → Node 20 → PostgreSQL → Caddy → pm2 → ファイアウォール → DB準備
# 何度実行しても安全です(冪等)。
# ---------------------------------------------------------------------------
set -euo pipefail

DB_NAME="${DB_NAME:-cms}"
DB_USER="${DB_USER:-cms}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
APP_DIR="${APP_DIR:-/srv/cms}"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
# 1. swap — RAM 2GBでNext.jsアプリを2つビルドするとOOMで落ちます。4GB確保しておきます。
# ---------------------------------------------------------------------------
if [ ! -f /swapfile ]; then
  log "swap 4GB作成"
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  log "swapはすでに存在 — スキップ"
fi

# ---------------------------------------------------------------------------
# 2. 基本パッケージ
# ---------------------------------------------------------------------------
log "apt更新および基本パッケージのインストール"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git build-essential ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https ufw

# ---------------------------------------------------------------------------
# 3. Node 20 (.nvmrcと同じ)
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  log "Node.js 20をインストール"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
log "Node $(node -v) / npm $(npm -v)"

# ---------------------------------------------------------------------------
# 4. PostgreSQL — docker-compose.ymlはローカル開発用なので、サーバーにはネイティブでインストールします
#    (コンテナのオーバーヘッドなしで2GB RAMを節約するため)
# ---------------------------------------------------------------------------
if ! command -v psql >/dev/null 2>&1; then
  log "PostgreSQLをインストール"
  apt-get install -y postgresql postgresql-contrib
fi
systemctl enable --now postgresql

log "データベース/アカウントを準備 ($DB_NAME / $DB_USER)"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
# Prisma migrateがスキーマを作成できるよう権限を付与
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# ---------------------------------------------------------------------------
# 5. Caddy — リバースプロキシ + Let's Encrypt証明書の自動発行/更新
# ---------------------------------------------------------------------------
if ! command -v caddy >/dev/null 2>&1; then
  log "Caddyをインストール"
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
  log "pm2をインストール"
  npm install -g pm2
  pm2 startup systemd -u root --hp /root >/dev/null
fi

# ---------------------------------------------------------------------------
# 7. ファイアウォール — 22/80/443だけを開け、アプリのポート(3000/3001/4000)は外部に公開しません。
#    Caddyだけがアプリにアクセスできればよいので、localhost通信で十分です。
# ---------------------------------------------------------------------------
log "ファイアウォール設定"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ---------------------------------------------------------------------------
# 8. アプリディレクトリ
# ---------------------------------------------------------------------------
mkdir -p "$APP_DIR"

cat <<EOF

============================================================
 サーバー準備完了
============================================================
 DATABASE_URLに使う値(必ずコピーしておいてください):

   postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME

 次の順序で進めてください:
   1) git clone <repo> $APP_DIR
   2) deploy/DEPLOY.md の「3. 環境変数」の通りに.envを3つ作成
   3) bash deploy/deploy.sh
============================================================

EOF
