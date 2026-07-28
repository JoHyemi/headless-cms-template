#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# デプロイスクリプト — サーバーの/srv/cmsで実行します。
#
#   cd /srv/cms && bash deploy/deploy.sh
#
# .envファイルが3つとも事前に作成されている必要があります(deploy/DEPLOY.md参照)。
# NEXT_PUBLIC_*の値はビルド時点でバンドルに埋め込まれるため、.envを直したら
# 必ずこのスクリプトを再度実行して再ビルドしないと反映されません。
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."
log() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

for f in apps/api/.env apps/admin/.env.production apps/website/.env.production; do
  if [ ! -f "$f" ]; then
    echo "ERROR: $f がありません。deploy/DEPLOY.md の「4. 環境変数」を先に進めてください。" >&2
    exit 1
  fi
done

log "依存関係のインストール"
npm ci

log "共有パッケージのビルド"
npm run build -w @cms/blocks

log "Prisma Client生成 + マイグレーション"
npm run prisma:generate -w @cms/api
# package.jsonのprisma:migrateは`migrate dev`(開発用、対話式)なので本番では使いません。
# apps/apiの中で実行しないと、prisma.config.tsが同じフォルダの.envを読み込みません。
(cd apps/api && npx prisma migrate deploy)

log "APIビルド"
npm run build -w @cms/api

# Next.jsのビルドはメモリを多く使います。2GBのVPSでは必ず順番に実行します。
log "adminビルド"
NODE_OPTIONS="--max-old-space-size=1536" npm run build -w @cms/admin

log "websiteビルド"
NODE_OPTIONS="--max-old-space-size=1536" npm run build -w @cms/website

log "管理者アカウントのシード(すでにあればスキップ)"
npm run db:seed -w @cms/api || echo "シードをスキップ(すでに実行済みの可能性があります)"

log "pm2起動"
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save

log "完了"
pm2 status
