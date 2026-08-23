#!/usr/bin/env bash
# Deploy standalone platform API on the shared EC2 (neighbor to NEXT-Performance).
# - Own Docker service on :3002
# - nginx location /api/platform/ → :3002 (dashboard rebuilds cannot wipe this)
# - Reuses DB_* + PLATFORM_* from next-performance/.env (same RDS, platform schema)
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

load_env "$ROOT/.cursor/deploy.local.env"
load_env "$ROOT/.env.deploy"

PEM="${PERF_EC2_PEM:-}"
HOST="${PERF_EC2_HOST:-}"
REMOTE_APP="${PERF_PLATFORM_API_DIR:-/home/ubuntu/fn-people-platform-api}"
DASHBOARD_DIR="${PERF_DASHBOARD_DIR:-/home/ubuntu/next-performance}"
API_PORT="${PERF_PLATFORM_API_PORT:-3002}"

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

echo "[platform-api] Preparing package-lock + RDS CA …"
if [[ ! -f "$ROOT/server/package-lock.json" ]]; then
  (cd "$ROOT/server" && npm install --package-lock-only --ignore-scripts)
fi
mkdir -p "$ROOT/server/certs"
if [[ ! -f "$ROOT/server/certs/rds-global-bundle.pem" ]]; then
  echo "[platform-api] Fetching RDS CA bundle from EC2 …"
  "${SSH[@]}" "cat '$DASHBOARD_DIR/certs/rds-global-bundle.pem'" \
    > "$ROOT/server/certs/rds-global-bundle.pem"
fi

echo "[platform-api] Syncing server → $HOST:$REMOTE_APP …"
"${SSH[@]}" "mkdir -p '$REMOTE_APP'"
"${RSYNC[@]}" \
  --delete \
  --exclude node_modules \
  --exclude .env \
  "$ROOT/server/" "$HOST:$REMOTE_APP/"

echo "[platform-api] Writing .env, nginx route, and Docker service …"
"${SSH[@]}" bash -s -- "$REMOTE_APP" "$DASHBOARD_DIR" "$API_PORT" <<'REMOTE'
set -euo pipefail
REMOTE_APP="$1"
DASHBOARD_DIR="$2"
API_PORT="$3"
DASH_ENV="$DASHBOARD_DIR/.env"
NGINX_SITE=/etc/nginx/sites-available/next-performance

if [[ ! -f "$DASH_ENV" ]]; then
  echo "Missing $DASH_ENV — need DB_* and PLATFORM_* from the dashboard host env." >&2
  exit 1
fi

python3 - "$DASH_ENV" "$REMOTE_APP/.env" "$API_PORT" <<'PY'
import sys
from pathlib import Path

src, dst_path, api_port = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
wanted = {
    "NODE_ENV",
    "APP_URL",
    "SESSION_SECRET",
    "PLATFORM_SESSION_SECRET",
    "PLATFORM_GOOGLE_CLIENT_ID",
    "PLATFORM_GOOGLE_CLIENT_SECRET",
    "PLATFORM_ALLOWED_EMAIL_DOMAIN",
    "PLATFORM_DEFAULT_PASSWORD",
    "PLATFORM_BOOTSTRAP_ADMIN_EMAILS",
    "DATABASE_URL",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USERNAME",
    "DB_PASS",
    "DB_SSL",
    "DB_SSL_CA_FILE",
    "DB_SSL_REJECT_UNAUTHORIZED",
    "PLATFORM_DB_USERNAME",
    "PLATFORM_DB_PASS",
}
vals = {}
for line in src.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, _, value = line.partition("=")
    key = key.strip()
    if key in wanted:
        vals[key] = value
vals["NODE_ENV"] = vals.get("NODE_ENV") or "production"
vals["PORT"] = api_port
if not str(vals.get("APP_URL", "")).strip():
    vals["APP_URL"] = "https://performance.nextventures.io"

platform_db_user = str(vals.get("PLATFORM_DB_USERNAME", "")).strip()
platform_db_pass = str(vals.get("PLATFORM_DB_PASS", "")).strip()
if platform_db_user and platform_db_pass:
    vals["DB_USERNAME"] = platform_db_user
    vals["DB_PASS"] = platform_db_pass
    vals.pop("DATABASE_URL", None)

has_database_url = bool(str(vals.get("DATABASE_URL", "")).strip())
required = ["PLATFORM_GOOGLE_CLIENT_ID", "PLATFORM_GOOGLE_CLIENT_SECRET"]
if not has_database_url:
    required += ["DB_HOST", "DB_NAME", "DB_USERNAME", "DB_PASS"]
missing = [k for k in required if not str(vals.get(k, "")).strip()]
if missing:
    raise SystemExit(f"Missing required env keys in dashboard .env: {', '.join(missing)}")

omit = {"PLATFORM_DB_USERNAME", "PLATFORM_DB_PASS"}
lines = [
    f"{k}={vals[k]}"
    for k in sorted(vals)
    if k not in omit and str(vals.get(k, "")) != ""
]
dst_path.write_text("\n".join(lines) + "\n")
print(f"  wrote {dst_path} ({len(lines)} keys)")
PY

mkdir -p "$REMOTE_APP/certs"
if [[ ! -s "$REMOTE_APP/certs/rds-global-bundle.pem" ]]; then
  cp "$DASHBOARD_DIR/certs/rds-global-bundle.pem" "$REMOTE_APP/certs/rds-global-bundle.pem"
fi

if ! grep -q 'location /api/platform/' "$NGINX_SITE"; then
  sudo python3 - "$NGINX_SITE" "$API_PORT" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
api_port = sys.argv[2]
text = path.read_text()
if "location /api/platform/" in text:
    raise SystemExit(0)
block = f"""    location /api/platform/ {{
        proxy_pass http://127.0.0.1:{api_port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
"""
needle = "    location / {"
if needle not in text:
    raise SystemExit("Could not find location / to insert /api/platform/ before it")
path.write_text(text.replace(needle, block + needle, 1))
print("  inserted nginx location /api/platform/")
PY
  sudo nginx -t
  sudo systemctl reload nginx
  echo "  nginx reloaded"
else
  echo "  nginx /api/platform/ already configured"
fi

echo "[platform-api] Building + starting Docker service on :$API_PORT …"
cd "$REMOTE_APP"
docker compose build
docker compose up -d

echo "[platform-api] Waiting for health …"
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$API_PORT/api/platform/health" >/dev/null 2>&1; then
    echo "  /api/platform/health OK"
    curl -fsS "http://127.0.0.1:$API_PORT/api/platform/health"
    echo
    if curl -fsS "https://performance.nextventures.io/api/platform/health" >/dev/null 2>&1; then
      echo "  public https://…/api/platform/health OK"
    else
      echo "  warning: public health check failed (nginx/TLS?)" >&2
    fi
    exit 0
  fi
  sleep 2
done
echo "Timed out waiting for /api/platform/health" >&2
docker compose ps >&2 || true
docker compose logs --tail=80 >&2 || true
exit 1
REMOTE

echo "[platform-api] Done. Dashboard deploys no longer affect /api/platform."
