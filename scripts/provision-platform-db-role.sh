#!/usr/bin/env bash
# Create a platform-only RDS role (DML on platform.*, no TRUNCATE, no public/auth)
# and store PLATFORM_DB_USERNAME / PLATFORM_DB_PASS on the EC2 dashboard .env
# so deploy:platform-api uses that role instead of the shared dashboard user.
#
# Usage (from repo root):
#   ./scripts/provision-platform-db-role.sh
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
REMOTE_APP_DIR="${PERF_DASHBOARD_DIR:-/home/ubuntu/next-performance}"
ROLE_NAME="${PLATFORM_DB_ROLE:-platform_app}"

if [[ -z "$HOST" || -z "$PEM" ]]; then
  echo "PERF_EC2_HOST and/or PERF_EC2_PEM are not set." >&2
  exit 1
fi
if [[ ! -f "$PEM" ]]; then
  echo "SSH key not found at: $PEM" >&2
  exit 1
fi

chmod 400 "$PEM"

ssh -i "$PEM" -o StrictHostKeyChecking=accept-new "$HOST" \
  bash -s -- "$REMOTE_APP_DIR" "$ROLE_NAME" <<'REMOTE'
set -euo pipefail
APP_DIR="$1"
ROLE_NAME="$2"
cd "$APP_DIR"
set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${DB_HOST:-}" || -z "${DB_NAME:-}" || -z "${DB_USERNAME:-}" || -z "${DB_PASS:-}" ]]; then
  echo "DB_HOST / DB_NAME / DB_USERNAME / DB_PASS missing in $APP_DIR/.env" >&2
  exit 1
fi

export PGPASSWORD="$DB_PASS"
export PGSSLMODE="${DB_SSL:-require}"
if [[ "$PGSSLMODE" == "true" ]]; then
  export PGSSLMODE=require
fi

psql_base=(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_NAME" -v ON_ERROR_STOP=1 -At)

if grep -q '^PLATFORM_DB_USERNAME=' .env && grep -q '^PLATFORM_DB_PASS=' .env; then
  echo "[platform-db-role] PLATFORM_DB_* already present in $APP_DIR/.env"
  EXISTING_ROLE="$("${psql_base[@]}" -c "SELECT 1 FROM pg_roles WHERE rolname = '$ROLE_NAME'")"
  if [[ "$EXISTING_ROLE" != "1" ]]; then
    echo "[platform-db-role] Role $ROLE_NAME is missing; recreating from stored password."
    ROLE_PASS="$(python3 - <<'PY'
from pathlib import Path
for line in Path(".env").read_text().splitlines():
    if line.startswith("PLATFORM_DB_PASS="):
        print(line.partition("=")[2], end="")
        break
PY
)"
    "${psql_base[@]}" -c "CREATE ROLE $ROLE_NAME LOGIN PASSWORD '$ROLE_PASS'"
  fi
else
  echo "[platform-db-role] Creating role $ROLE_NAME …"
  ROLE_PASS="$(openssl rand -base64 32 | tr -d '\n')"
  if ! "${psql_base[@]}" -c "CREATE ROLE $ROLE_NAME LOGIN PASSWORD '$ROLE_PASS'"; then
    echo "[platform-db-role] The dashboard DB user cannot CREATE ROLE." >&2
    echo "Run this script as the RDS master user, or create $ROLE_NAME yourself and set PLATFORM_DB_USERNAME / PLATFORM_DB_PASS in $APP_DIR/.env." >&2
    exit 1
  fi
  {
    echo ""
    echo "# Platform API only - not used by the dashboard. Written by provision-platform-db-role.sh"
    echo "PLATFORM_DB_USERNAME=$ROLE_NAME"
    echo "PLATFORM_DB_PASS=$ROLE_PASS"
  } >> .env
  echo "[platform-db-role] Wrote PLATFORM_DB_* to $APP_DIR/.env"
fi

echo "[platform-db-role] Granting platform.* DML …"
"${psql_base[@]}" <<SQL
GRANT CONNECT ON DATABASE ${DB_NAME} TO ${ROLE_NAME};
GRANT USAGE ON SCHEMA platform TO ${ROLE_NAME};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA platform TO ${ROLE_NAME};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA platform TO ${ROLE_NAME};
ALTER DEFAULT PRIVILEGES IN SCHEMA platform
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ROLE_NAME};
ALTER DEFAULT PRIVILEGES IN SCHEMA platform
  GRANT USAGE, SELECT ON SEQUENCES TO ${ROLE_NAME};
REVOKE INSERT, UPDATE, DELETE ON platform.schema_migrations FROM ${ROLE_NAME};
REVOKE UPDATE, DELETE, TRUNCATE ON platform.activity_events FROM ${ROLE_NAME};
ALTER ROLE ${ROLE_NAME} SET search_path = platform;
SQL

"${psql_base[@]}" -c "REVOKE ALL ON SCHEMA public FROM ${ROLE_NAME}" || true
"${psql_base[@]}" -c "REVOKE ALL ON SCHEMA auth FROM ${ROLE_NAME}" || true

echo "[platform-db-role] Verifying login and privilege surface …"
PLATFORM_USER="$(python3 - <<'PY'
from pathlib import Path
vals = {}
for line in Path(".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        key, _, value = line.partition("=")
        vals[key] = value
print(vals.get("PLATFORM_DB_USERNAME", ""), end="")
PY
)"
PLATFORM_PASS="$(python3 - <<'PY'
from pathlib import Path
vals = {}
for line in Path(".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        key, _, value = line.partition("=")
        vals[key] = value
print(vals.get("PLATFORM_DB_PASS", ""), end="")
PY
)"
export PGPASSWORD="$PLATFORM_PASS"
psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$PLATFORM_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT current_user;
SELECT has_table_privilege(current_user, 'platform.goals', 'SELECT')
    AND has_table_privilege(current_user, 'platform.goals', 'INSERT')
    AND NOT has_table_privilege(current_user, 'platform.activity_events', 'TRUNCATE')
    AND NOT has_table_privilege(current_user, 'platform.activity_events', 'DELETE');
SQL

echo "[platform-db-role] Done. Redeploy the platform API so it picks up the role."
REMOTE
