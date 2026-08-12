#!/usr/bin/env bash
# Apply db/migrations/*.sql to shared RDS via the performance EC2 box.
# RDS is VPC-private — runs psql on the host using next-performance/.env (DB_*).
#
# Usage (from repo root):
#   ./scripts/apply-platform-migrations.sh
#
# Requires .env.deploy with PERF_EC2_HOST + PERF_EC2_PEM (same as deploy:ec2).
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
REMOTE_APP_DIR="${PERF_DASHBOARD_DIR:-/home/ubuntu/next-performance}"
REMOTE_MIG_DIR="${PERF_PLATFORM_MIG_DIR:-/tmp/platform-migrations}"

if [[ -z "$HOST" || -z "$PEM" ]]; then
  echo "PERF_EC2_HOST and/or PERF_EC2_PEM are not set." >&2
  echo "Copy .env.deploy.example → .env.deploy and fill both in." >&2
  exit 1
fi

if [[ ! -f "$PEM" ]]; then
  echo "SSH key not found at: $PEM" >&2
  exit 1
fi

chmod 400 "$PEM"
SSH=(ssh -i "$PEM" -o StrictHostKeyChecking=accept-new "$HOST")
RSYNC=(rsync -az -e "ssh -i $PEM -o StrictHostKeyChecking=accept-new")

MIGRATIONS=()
while IFS= read -r f; do
  MIGRATIONS+=("$f")
done < <(ls -1 "$ROOT"/db/migrations/*.sql | sort)
if [[ ${#MIGRATIONS[@]} -eq 0 ]]; then
  echo "No SQL files in db/migrations/" >&2
  exit 1
fi

echo "[platform-db] Syncing ${#MIGRATIONS[@]} migration(s) to $HOST:$REMOTE_MIG_DIR …"
"${SSH[@]}" "mkdir -p '$REMOTE_MIG_DIR' && rm -f '$REMOTE_MIG_DIR'/*.sql"
"${RSYNC[@]}" "${MIGRATIONS[@]}" "$HOST:$REMOTE_MIG_DIR/"

echo "[platform-db] Applying on RDS (via $REMOTE_APP_DIR/.env) …"
"${SSH[@]}" bash -s -- "$REMOTE_APP_DIR" "$REMOTE_MIG_DIR" <<'REMOTE'
set -euo pipefail
APP_DIR="$1"
MIG_DIR="$2"
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

psql_base=(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_NAME" -v ON_ERROR_STOP=1)

# Ensure schema + migrations ledger exist before per-file tracking.
"${psql_base[@]}" -f "$MIG_DIR/00001_platform_schema.sql"
"${psql_base[@]}" -c "INSERT INTO platform.schema_migrations (id) VALUES ('00001_platform_schema.sql') ON CONFLICT DO NOTHING;"

shopt -s nullglob
for file in "$MIG_DIR"/*.sql; do
  base="$(basename "$file")"
  [[ "$base" == "00001_platform_schema.sql" ]] && continue
  already="$("${psql_base[@]}" -Atc "SELECT 1 FROM platform.schema_migrations WHERE id = '$base' LIMIT 1;")"
  if [[ "$already" == "1" ]]; then
    echo "  skip $base (already applied)"
    continue
  fi
  echo "  apply $base"
  "${psql_base[@]}" -f "$file"
  "${psql_base[@]}" -c "INSERT INTO platform.schema_migrations (id) VALUES ('$base');"
done

echo "[platform-db] Current platform tables:"
"${psql_base[@]}" -c "\dt platform.*"
"${psql_base[@]}" -c "SELECT id, applied_at FROM platform.schema_migrations ORDER BY id;"
REMOTE

echo "[platform-db] Done."
