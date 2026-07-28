#!/usr/bin/env bash
# local-demo.sh가 띄운 프로세스(api, admin, website, cloudflared 터널 3개)를 모두 정리합니다.
#   bash deploy/local-demo-stop.sh
set -uo pipefail
cd "$(dirname "$0")/.."
PID_FILE="deploy/.demo-pids"

if [ ! -f "$PID_FILE" ]; then
  echo "정리할 게 없습니다 ($PID_FILE 없음)."
  exit 0
fi

while read -r pid; do
  [ -z "$pid" ] && continue
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null && echo "종료: PID $pid"
  fi
done < "$PID_FILE"

rm -f "$PID_FILE"
echo "완료. (로컬 Postgres 컨테이너는 계속 켜져 있습니다 — 끄려면: docker compose down)"
