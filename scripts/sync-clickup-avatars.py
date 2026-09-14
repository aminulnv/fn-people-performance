#!/usr/bin/env python3
"""
Sync ClickUp workspace profile pictures onto platform.employees.avatar_url.

Usage (on EC2 or any host with DB access + network to ClickUp):

  export CLICKUP_API_TOKEN=pk_...
  export CLICKUP_WORKSPACE_NAME='NEXT Ventures'   # optional
  # DB_* / PLATFORM_DB_* from next-performance/.env, or pass --env-file

  python3 scripts/sync-clickup-avatars.py \\
    --env-file /home/ubuntu/next-performance/.env

Never commit the API token.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path


def load_env_file(path: Path) -> dict[str, str]:
    vals: dict[str, str] = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        vals[key.strip()] = value
    return vals


def fetch_clickup_avatars(token: str, workspace_name: str) -> list[dict[str, str]]:
    req = urllib.request.Request(
        "https://api.clickup.com/api/v2/team",
        headers={"Authorization": token},
    )
    with urllib.request.urlopen(req) as response:
        data = json.load(response)
    team = next(
        (item for item in data.get("teams") or [] if item.get("name") == workspace_name),
        None,
    )
    if team is None:
        names = [item.get("name") for item in data.get("teams") or []]
        raise SystemExit(f"Workspace {workspace_name!r} not found. Available: {names}")

    rows: list[dict[str, str]] = []
    seen: set[str] = set()
    for member in team.get("members") or []:
        user = member.get("user") or {}
        email = str(user.get("email") or "").strip().lower()
        picture = str(user.get("profilePicture") or "").strip()
        if not email or not picture or email in seen:
            continue
        seen.add(email)
        rows.append({"email": email, "avatar_url": picture})
    print(
        f"ClickUp {workspace_name}: {len(team.get('members') or [])} members, "
        f"{len(rows)} with profilePicture"
    )
    return rows


def apply_avatars(rows: list[dict[str, str]], db: dict[str, str]) -> None:
    values = []
    for row in rows:
        email = row["email"].replace("'", "''")
        url = row["avatar_url"].replace("'", "''")
        local = email.split("@", 1)[0].replace("'", "''")
        values.append(f"('{email}', '{local}', '{url}')")

    sql = f"""
BEGIN;
CREATE TEMP TABLE clickup_avatars (
  email text PRIMARY KEY,
  local_part text NOT NULL,
  avatar_url text NOT NULL
);
INSERT INTO clickup_avatars (email, local_part, avatar_url) VALUES
{',\n'.join(values)};

WITH exact AS (
  UPDATE platform.employees e
  SET avatar_url = c.avatar_url, updated_at = NOW()
  FROM clickup_avatars c
  WHERE lower(e.email) = c.email
    AND e.avatar_url IS DISTINCT FROM c.avatar_url
  RETURNING 1
),
alias AS (
  UPDATE platform.employees e
  SET avatar_url = c.avatar_url, updated_at = NOW()
  FROM clickup_avatars c
  WHERE split_part(lower(e.email), '@', 1) = c.local_part
    AND lower(e.email) <> c.email
    AND (
      lower(e.email) LIKE '%@nextventures.io'
      OR lower(e.email) LIKE '%@wearenext.io'
    )
    AND (
      c.email LIKE '%@nextventures.io'
      OR c.email LIKE '%@wearenext.io'
    )
    AND NOT EXISTS (
      SELECT 1 FROM clickup_avatars c2 WHERE c2.email = lower(e.email)
    )
    AND e.avatar_url IS DISTINCT FROM c.avatar_url
  RETURNING 1
)
SELECT
  (SELECT count(*) FROM exact) AS exact_updated,
  (SELECT count(*) FROM alias) AS alias_updated,
  (SELECT count(*) FROM platform.employees WHERE avatar_url <> '') AS with_avatar,
  (SELECT count(*) FROM platform.employees WHERE avatar_url = '') AS without_avatar;

COMMIT;
"""
    sql_path = Path("/tmp/sync-clickup-avatars.sql")
    sql_path.write_text(sql)

    user = (db.get("PLATFORM_DB_USERNAME") or db.get("DB_USERNAME") or "").strip()
    password = (db.get("PLATFORM_DB_PASS") or db.get("DB_PASS") or "").strip()
    host = db["DB_HOST"].strip()
    port = (db.get("DB_PORT") or "5432").strip()
    name = db["DB_NAME"].strip()

    envp = os.environ.copy()
    envp["PGPASSWORD"] = password
    proc = subprocess.run(
        [
            "psql",
            f"host={host} port={port} dbname={name} user={user} sslmode=require",
            "-v",
            "ON_ERROR_STOP=1",
            "-f",
            str(sql_path),
        ],
        env=envp,
        capture_output=True,
        text=True,
    )
    sys.stdout.write(proc.stdout)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        raise SystemExit(proc.returncode)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--env-file",
        default="/home/ubuntu/next-performance/.env",
        help="Path to env file with DB_* / PLATFORM_DB_*",
    )
    parser.add_argument(
        "--workspace",
        default=os.environ.get("CLICKUP_WORKSPACE_NAME", "NEXT Ventures"),
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("CLICKUP_API_TOKEN", ""),
        help="Or set CLICKUP_API_TOKEN",
    )
    args = parser.parse_args()
    if not args.token.strip():
        raise SystemExit("Set CLICKUP_API_TOKEN or pass --token")

    rows = fetch_clickup_avatars(args.token.strip(), args.workspace)
    if not rows:
        raise SystemExit("No avatars returned from ClickUp")
    apply_avatars(rows, load_env_file(Path(args.env_file)))
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
