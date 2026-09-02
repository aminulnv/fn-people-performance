#!/usr/bin/env bash
# Independently deploy this platform UI to:
#   https://performance.nextventures.io/platform/
# Same EC2 as the dashboard - only updates /var/www/platform (+ nginx /platform if missing).
# Does NOT redeploy the dashboard, touch RDS, or need DB credentials.
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
load_env "$ROOT/.env"

PEM="${PERF_EC2_PEM:-${PEM:-}}"
HOST="${PERF_EC2_HOST:-${EC2_HOST:-}}"
REMOTE_WEB_DIR="${PERF_PLATFORM_WEB_DIR:-/var/www/platform}"
REMOTE_STAGING="${PERF_PLATFORM_STAGING:-/home/ubuntu/fn-people-performance-staging}"

# Host + key path stay out of git: no baked-in defaults here.
if [[ -z "$HOST" || -z "$PEM" ]]; then
  echo "PERF_EC2_HOST and/or PERF_EC2_PEM are not set." >&2
  echo "Copy .env.deploy.example → .env.deploy and fill both in (.env.deploy is gitignored)." >&2
  exit 1
fi

if [[ ! -f "$PEM" ]]; then
  echo "SSH key not found at: $PEM (check PERF_EC2_PEM in .env.deploy)" >&2
  exit 1
fi

chmod 400 "$PEM"
SSH=(ssh -i "$PEM" -o StrictHostKeyChecking=accept-new "$HOST")
RSYNC=(rsync -az --delete -e "ssh -i $PEM -o StrictHostKeyChecking=accept-new")

echo "[platform] Building for /platform/ …"
if [[ ! -d node_modules ]]; then
  npm ci
fi
VITE_BASE_PATH=/platform/ npm run build

if [[ ! -f dist/index.html ]]; then
  echo "Build failed: dist/index.html missing" >&2
  exit 1
fi

echo "[platform] Uploading → $HOST:$REMOTE_WEB_DIR/"
"${SSH[@]}" "mkdir -p '$REMOTE_STAGING'"
"${RSYNC[@]}" dist/ "$HOST:$REMOTE_STAGING/"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
sudo mkdir -p '$REMOTE_WEB_DIR'
sudo rsync -a --delete '$REMOTE_STAGING/' '$REMOTE_WEB_DIR/'
sudo chown -R root:www-data '$REMOTE_WEB_DIR'
sudo find '$REMOTE_WEB_DIR' -type d -exec chmod 755 {} \;
sudo find '$REMOTE_WEB_DIR' -type f -exec chmod 644 {} \;
REMOTE

echo "[platform] Ensuring nginx /platform/ …"
"${SSH[@]}" bash -s <<'REMOTE'
set -euo pipefail
NGINX_SITE=/etc/nginx/sites-available/next-performance
if [[ ! -f "$NGINX_SITE" ]]; then
  echo "Missing $NGINX_SITE - dashboard must already be on this EC2." >&2
  exit 1
fi

if ! grep -q 'location /platform/' "$NGINX_SITE"; then
  sudo python3 - <<'PY'
from pathlib import Path
path = Path("/etc/nginx/sites-available/next-performance")
text = path.read_text()
needle = "    location / {"
block = """    location = /platform {
        return 301 /platform/;
    }
    location /platform/ {
        root /var/www;
        try_files $uri $uri/ /platform/index.html;
    }
"""
if needle not in text:
    raise SystemExit("Could not find catch-all location / in nginx config")
path.write_text(text.replace(needle, block + needle, 1))
print("Inserted /platform locations")
PY
elif grep -q 'root /home/ubuntu/fn-people-performance;' "$NGINX_SITE"; then
  sudo sed -i 's|root /home/ubuntu/fn-people-performance;|root /var/www;|' "$NGINX_SITE"
  echo "Fixed /platform root → /var/www"
else
  echo "nginx /platform already configured"
fi

sudo nginx -t
sudo systemctl reload nginx
REMOTE

echo "[platform] Verify"
curl -fsS -o /dev/null -w "  /platform/ → %{http_code}\n" https://performance.nextventures.io/platform/
echo "[platform] Live → https://performance.nextventures.io/platform/"
