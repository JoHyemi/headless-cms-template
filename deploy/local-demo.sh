#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# 対面デモ用: ローカルでプロダクションビルドの3つのアプリを起動し、cloudflaredトンネルで
# website/adminにアクセスできるhttps URLを発行します。
#
# 必ず自分のノートPC(Mac)のターミナルで直接実行してください — リモートサンドボックスではなく
# 「今この場で」インターネットに繋がっているコンピューターでないとトンネルの意味がありません。
#
#   cd cms
#   bash deploy/local-demo.sh
#
# 終わったらdeploy/local-demo-stop.shで片付けてください。
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
# 0. 事前チェック
# ---------------------------------------------------------------------------
command -v docker  >/dev/null 2>&1 || die "dockerがありません。先にDocker Desktopを起動してください。"
command -v npm     >/dev/null 2>&1 || die "npmがありません。"

if ! command -v cloudflared >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    log "cloudflaredをインストール (brew)"
    brew install cloudflared
  else
    die "cloudflaredがありません。'brew install cloudflared' でインストール後、再実行してください。"
  fi
fi

[ -f apps/api/.env ] || die "apps/api/.env がありません。.env.exampleをコピーして先に埋めておいてください。"

# ---------------------------------------------------------------------------
# 1. ローカルPostgres
# ---------------------------------------------------------------------------
log "ローカルPostgresを起動"
docker compose up -d db

log "Postgresがhealthyになるのを待機"
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U "${POSTGRES_USER:-cms}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  [ "$i" -eq 30 ] && die "Postgresが30秒以内に準備できませんでした。'docker compose logs db' を確認してください。"
done

# ---------------------------------------------------------------------------
# 2. ビルド (共有パッケージ → api)
# ---------------------------------------------------------------------------
log "@cms/blocksをビルド"
npm run build -w @cms/blocks

log "Prisma Client生成 + マイグレーション適用"
npm run prisma:generate -w @cms/api
(cd apps/api && npx prisma migrate deploy)

log "apiをビルド"
npm run build -w @cms/api

log "管理者アカウントのシード(すでにあればスキップ)"
npm run db:seed -w @cms/api || warn "シードをスキップ(すでに実行済みの可能性があります)"

# ---------------------------------------------------------------------------
# 3. api起動 — 今日だけクッキー/CORSをトンネル環境に合わせてインラインで緩和します。
#    .envファイルには手を加えません(これらの値はプロセス終了とともに消えます)。
#      - COOKIE_SAME_SITE=none : adminとapiが別々のトンネルドメインになるため、
#        sameSite=lax(デフォルト)だとログイン後のセッションクッキーがadmin→apiリクエストに乗りません。
#      - CORS_ORIGINS=""       : トンネルURLは毎回ランダムなので、事前にCORS許可リストに
#        入れておくことができません。空にしておくとmain.tsがリクエストのOriginをそのまま反射的に許可します。
# ---------------------------------------------------------------------------
log "api起動 (ポート4000)"
(cd apps/api && COOKIE_SAME_SITE=none CORS_ORIGINS="" PORT=4000 node dist/main.js) \
  > "$LOG_DIR/api.log" 2>&1 &
API_PID=$!
track_pid "$API_PID"

log "apiの応答を待機"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/ || echo 000)
  [ "$code" != "000" ] && break
  sleep 1
  [ "$i" -eq 30 ] && die "apiが30秒以内に応答しません。$LOG_DIR/api.log を確認してください。"
done

# ---------------------------------------------------------------------------
# 4. apiトンネル — admin/websiteのビルドにこのURLを埋め込む必要があるため最初に開きます。
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

log "apiトンネルを開く"
cloudflared tunnel --url http://localhost:4000 > "$LOG_DIR/tunnel-api.log" 2>&1 &
track_pid "$!"
API_URL_PUBLIC=$(wait_for_tunnel_url "$LOG_DIR/tunnel-api.log") \
  || die "apiトンネルのURLを取得できませんでした。$LOG_DIR/tunnel-api.log を確認してください。"
log "api公開URL: $API_URL_PUBLIC"

# ---------------------------------------------------------------------------
# 5. admin/websiteにapiトンネルURLを注入してからビルド
#    .env.production.localはnext build(NODE_ENV=production)時に.env.localより
#    優先して適用され、ブラウザバンドルにこの値が埋め込まれます。
# ---------------------------------------------------------------------------
log "admin/websiteの環境変数を作成"
# adminはNEXT_PUBLIC_API_URLに自分自身の相対パス(/api-proxy)を使う — apiの別ドメインを
# 直接ブラウザから叩かせると、ログインで発行されるセッションクッキーがapiのドメインにしか
# 乗らず、admin自身のサーバー側認証チェック(proxy.ts)から見えなくなるため。
# API_PROXY_TARGETはnext.config.tsのrewrites()が読み、admin自身のサーバーがapiへ
# リバースプロキシする(ブラウザは常にadminの自ドメインだけを見る)。
# websiteはログイン不要な公開読み取り専用なので、そのままapiトンネルを直接呼び出す。
cat > apps/admin/.env.production.local <<EOF
API_URL=http://localhost:4000
API_PROXY_TARGET=http://localhost:4000
NEXT_PUBLIC_API_URL=/api-proxy
EOF
cat > apps/website/.env.production.local <<EOF
NEXT_PUBLIC_API_URL=$API_URL_PUBLIC
EOF

log "adminをビルド"
npm run build -w @cms/admin

log "websiteをビルド"
npm run build -w @cms/website

# ---------------------------------------------------------------------------
# 6. admin/website起動
# ---------------------------------------------------------------------------
log "admin起動 (ポート3001)"
npm run start -w @cms/admin > "$LOG_DIR/admin.log" 2>&1 &
track_pid "$!"

log "website起動 (ポート3000)"
npm run start -w @cms/website > "$LOG_DIR/website.log" 2>&1 &
track_pid "$!"

for port in 3001 3000; do
  for i in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$port/" || echo 000)
    [ "$code" != "000" ] && break
    sleep 1
    [ "$i" -eq 30 ] && die "ポート $port が30秒以内に応答しません。ログを確認してください。"
  done
done

# ---------------------------------------------------------------------------
# 7. admin/websiteトンネル
# ---------------------------------------------------------------------------
log "adminトンネルを開く"
cloudflared tunnel --url http://localhost:3001 > "$LOG_DIR/tunnel-admin.log" 2>&1 &
track_pid "$!"
ADMIN_URL_PUBLIC=$(wait_for_tunnel_url "$LOG_DIR/tunnel-admin.log") \
  || die "adminトンネルのURLを取得できませんでした。$LOG_DIR/tunnel-admin.log を確認してください。"

log "websiteトンネルを開く"
cloudflared tunnel --url http://localhost:3000 > "$LOG_DIR/tunnel-website.log" 2>&1 &
track_pid "$!"
WEBSITE_URL_PUBLIC=$(wait_for_tunnel_url "$LOG_DIR/tunnel-website.log") \
  || die "websiteトンネルのURLを取得できませんでした。$LOG_DIR/tunnel-website.log を確認してください。"

ADMIN_EMAIL=$(grep -E '^ADMIN_EMAIL=' apps/api/.env | cut -d= -f2- | tr -d '"')

cat <<EOF

============================================================
 デモ準備完了 — 下の2つのURLだけ使えばOKです
============================================================
 公開サイト: $WEBSITE_URL_PUBLIC
 管理画面: $ADMIN_URL_PUBLIC   (ログイン: $ADMIN_EMAIL / apps/api/.envのADMIN_PASSWORD)

 注意:
 - これらのURLはこのスクリプトを起動している間だけ有効です。ノートPCを
   スリープさせたり、ターミナルを閉じたりすると切れます。
 - リンクは参加者にQRコードやチャットで共有してください。毎回ランダムなので
   再起動するとURLが変わります。
 - 終わったら:  bash deploy/local-demo-stop.sh
============================================================

EOF
