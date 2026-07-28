#!/usr/bin/env bash
# local-demo.shが起動したプロセス(api, admin, website, cloudflaredトンネル3つ)をすべて片付けます。
#   bash deploy/local-demo-stop.sh
set -uo pipefail
cd "$(dirname "$0")/.."
PID_FILE="deploy/.demo-pids"

if [ ! -f "$PID_FILE" ]; then
  echo "片付けるものがありません($PID_FILE なし)。"
  exit 0
fi

while read -r pid; do
  [ -z "$pid" ] && continue
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null && echo "終了: PID $pid"
  fi
done < "$PID_FILE"

rm -f "$PID_FILE"
echo "完了。(ローカルPostgresコンテナは動いたままです — 止めるには: docker compose down)"
