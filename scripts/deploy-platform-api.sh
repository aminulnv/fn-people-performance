#!/usr/bin/env bash
# Sync server/platform into NEXT-Performance on EC2, wire registerPlatformRoutes,
# rebuild the Docker API container so /api/platform hits live RDS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_env() {
  local f="$1"
  if [[ -f "$f" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$f"
    set +a
  fi
}

load_env "$ROOT/.env.deploy"

PEM="${PERF_EC2_PEM:-}"
HOST="${PERF_EC2_HOST:-}"
REMOTE_APP="${PERF_DASHBOARD_DIR:-/home/ubuntu/next-performance}"

if [[ -z "$HOST" || -z "$PEM" ]]; then
  echo "PERF_EC2_HOST and/or PERF_EC2_PEM are not set (.env.deploy)." >&2
  exit 1
fi
if [[ ! -f "$PEM" ]]; then
  echo "SSH key not found at: $PEM" >&2
  exit 1
fi

chmod 400 "$PEM"
SSH=(ssh -i "$PEM" -o StrictHostKeyChecking=accept-new "$HOST")
RSYNC=(rsync -az -e "ssh -i $PEM -o StrictHostKeyChecking=accept-new")

echo "[platform-api] Syncing server/platform → $HOST:$REMOTE_APP/server/platform …"
"${SSH[@]}" "mkdir -p '$REMOTE_APP/server/platform'"
"${RSYNC[@]}" "$ROOT/server/platform/" "$HOST:$REMOTE_APP/server/platform/"

echo "[platform-api] Ensuring app.mjs registers platform routes …"
"${SSH[@]}" bash -s -- "$REMOTE_APP" <<'REMOTE'
set -euo pipefail
APP_DIR="$1"
APP_MJS="$APP_DIR/server/app.mjs"

if grep -q "registerPlatformRoutes" "$APP_MJS"; then
  echo "  registerPlatformRoutes already present"
else
  APP_MJS="$APP_MJS" python3 <<'PY'
from pathlib import Path
import os
app = Path(os.environ['APP_MJS'])
text = app.read_text()
import_line = "import { registerPlatformRoutes } from './platform/routes.mjs'\n"
if "registerPlatformRoutes" in text:
    raise SystemExit(0)
needle = "import { registerPipRoutes } from './pipRoutes.mjs'\n"
if needle not in text:
    raise SystemExit('Could not find registerPipRoutes import to anchor platform import')
text = text.replace(needle, needle + import_line, 1)
call_needle = "registerPipRoutes(app)\n"
if call_needle not in text:
    raise SystemExit('Could not find registerPipRoutes(app) call')
text = text.replace(call_needle, call_needle + "registerPlatformRoutes(app)\n", 1)
app.write_text(text)
print('  patched app.mjs')
PY
fi

echo "[platform-api] Rebuilding Docker app (this may take a few minutes) …"
cd "$APP_DIR"
docker compose -f docker-compose.ec2.yml build app
docker compose -f docker-compose.ec2.yml up -d app

echo "[platform-api] Waiting for health …"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:3001/api/platform/health" >/dev/null 2>&1; then
    echo "  /api/platform/health OK"
    curl -fsS "http://127.0.0.1:3001/api/platform/health"
    echo
    exit 0
  fi
  sleep 2
done
echo "Timed out waiting for /api/platform/health" >&2
docker compose -f docker-compose.ec2.yml ps >&2 || true
exit 1
REMOTE

echo "[platform-api] Done."
