#!/usr/bin/env bash
# Seed competency matrices for every active role that has fewer than 3 skills.
# Skills come from the catalog; profiles inherit via employees.role_id.
#
# Usage (from repo root):
#   ./scripts/seed-role-skills.sh
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

load_env "$ROOT/.cursor/deploy.local.env"
load_env "$ROOT/.env.deploy"

PEM="${PERF_EC2_PEM:-}"
HOST="${PERF_EC2_HOST:-}"
REMOTE_APP_DIR="${PERF_DASHBOARD_DIR:-/home/ubuntu/next-performance}"
REMOTE_SQL="/tmp/seed-role-skills.sql"

if [[ -z "$HOST" || -z "$PEM" ]]; then
  echo "PERF_EC2_HOST and/or PERF_EC2_PEM are not set." >&2
  exit 1
fi
if [[ ! -f "$PEM" ]]; then
  echo "SSH key not found at: $PEM" >&2
  exit 1
fi

chmod 400 "$PEM"
SSH=(ssh -i "$PEM" -o StrictHostKeyChecking=accept-new "$HOST")
RSYNC=(rsync -az -e "ssh -i $PEM -o StrictHostKeyChecking=accept-new")

SQL_LOCAL="$ROOT/backups/seed-role-skills.sql"
python3 - "$SQL_LOCAL" <<'PY'
"""Generate INSERT SQL that maps 3–4 catalog skills onto every under-mapped role."""
from pathlib import Path
import sys

out = Path(sys.argv[1])

# Department-family → preferred skill ids (catalog ids from ensureDefaultSkills).
FAMILY_SKILLS = {
    "finance": [
        "skill-financial-accuracy",
        "skill-accuracy",
        "skill-analytical-thinking",
        "skill-process-design",
    ],
    "technology": [
        "skill-delivery-ownership",
        "skill-ai-fluency",
        "skill-analytical-methods",
        "skill-process-design",
    ],
    "product": [
        "skill-analytical-methods",
        "skill-data-storytelling",
        "skill-delivery-ownership",
        "skill-ai-fluency",
    ],
    "marketing": [
        "skill-written-comms",
        "skill-stakeholder-comms",
        "skill-data-storytelling",
        "skill-ai-fluency",
    ],
    "people": [
        "skill-stakeholder-comms",
        "skill-coaching",
        "skill-admin-support",
        "skill-written-comms",
    ],
    "cx": [
        "skill-stakeholder-comms",
        "skill-written-comms",
        "skill-process-design",
        "skill-accuracy",
    ],
    "operations": [
        "skill-process-design",
        "skill-accuracy",
        "skill-delivery-ownership",
        "skill-stakeholder-comms",
    ],
    "sales": [
        "skill-account-planning",
        "skill-acquisition-negotiation",
        "skill-stakeholder-comms",
        "skill-written-comms",
    ],
    "risk": [
        "skill-risk-judgement",
        "skill-analytical-thinking",
        "skill-accuracy",
        "skill-delivery-ownership",
    ],
    "legal": [
        "skill-written-comms",
        "skill-risk-judgement",
        "skill-accuracy",
        "skill-stakeholder-comms",
    ],
    "payments": [
        "skill-accuracy",
        "skill-process-design",
        "skill-analytical-thinking",
        "skill-risk-judgement",
    ],
    "leadership": [
        "skill-people-leadership",
        "skill-coaching",
        "skill-stakeholder-comms",
        "skill-ai-fluency",
    ],
    "default": [
        "skill-stakeholder-comms",
        "skill-written-comms",
        "skill-delivery-ownership",
        "skill-ai-fluency",
    ],
}

MANAGER_EXTRA = ["skill-people-leadership", "skill-coaching"]

GRADES = [
    ("IC1", "basic"),
    ("IC2", "intermediate"),
    ("IC3", "intermediate"),
    ("IC4", "advanced"),
    ("IC5", "advanced"),
    ("M1", "intermediate"),
    ("M2", "advanced"),
    ("M3", "advanced"),
    ("M4", "expert"),
    ("L1", "advanced"),
    ("L2", "expert"),
    ("L3", "expert"),
]


def family_for(dept: str, role: str) -> str:
    text = f"{dept} {role}".lower()
    rules = [
        ("leadership", ("lt teams", "chief ", "head of", "cxo", "ceo", "cso", "cdo")),
        ("finance", ("finance", "audit", "accountant", "accounts payable", "controller", "revenue assurance")),
        ("technology", ("technology", "software", "engineer", "devops", "qa ", "quality assurance", "cyber", "data engineer", "machine learning", "solution architect")),
        ("product", ("product", "business intelligence", "analytics", "designer")),
        ("marketing", ("marketing", "brand", "media", "content", "social", "seo", "creative", "cinematographer", "video")),
        ("people", ("people", "hr ", "hris", "talent", "l&d", "payroll", "culture", "employer branding", "ptr")),
        ("cx", ("client experience", "cx ", "communications quality")),
        ("sales", ("sales", "business development", "partner acquisition", "partner relationship")),
        ("risk", ("trading", "risk", "fraud", "dealing")),
        ("legal", ("legal", "compliance", "corporate affairs", "visa")),
        ("payments", ("payment", "treasury", "chargeback")),
        ("operations", ("operations", "back office", "workforce", "wfm", "project management", "admin")),
    ]
    for family, needles in rules:
        if any(n in text for n in needles):
            return family
    return "default"


def pick_skills(dept: str, role: str) -> list[str]:
    family = family_for(dept, role)
    skills = list(FAMILY_SKILLS[family])
    role_l = role.lower()
    is_manager = any(
        token in role_l
        for token in (
            "manager",
            "lead,",
            "lead ",
            "head of",
            "director",
            "chief",
            "captain",
            "hod",
        )
    )
    if is_manager:
        for extra in MANAGER_EXTRA:
            if extra not in skills:
                skills.append(extra)
    # Cap at 4, keep order stable
    return skills[:4]


lines = [
    "-- Generated by scripts/seed-role-skills.sh — do not edit by hand.",
    "-- Fills platform.role_skills (+ grade expectations) for under-mapped roles.",
    "BEGIN;",
    "",
    "-- Ensure catalog skills exist (same ids as ensureDefaultSkills).",
]

# Skill catalog upserts (minimal columns; mastery defaults empty).
SEED = [
    ("skill-account-planning", "Account Planning", ""),
    ("skill-accuracy", "Accuracy", ""),
    ("skill-financial-accuracy", "Accuracy in Financial Processing", ""),
    ("skill-acquisition-negotiation", "Acquisition and Negotiation", ""),
    ("skill-admin-support", "Administrative Support", ""),
    ("skill-ai-fluency", "AI Fluency", ""),
    ("skill-analytical-methods", "Analytical and Statistical Methods", ""),
    ("skill-analytical-thinking", "Analytical Thinking", ""),
    ("skill-stakeholder-comms", "Stakeholder Communication", ""),
    ("skill-delivery-ownership", "Delivery Ownership", ""),
    ("skill-people-leadership", "People Leadership", "Manager"),
    ("skill-coaching", "Coaching and Feedback", "Manager"),
    ("skill-data-storytelling", "Analytical Insight and Context Building", ""),
    ("skill-risk-judgement", "Risk Judgement", ""),
    ("skill-process-design", "Process Design", ""),
    ("skill-written-comms", "Written Communication", ""),
]
empty_mastery = (
    '\'{"none":"","basic":"","intermediate":"","advanced":"","expert":""}\'::jsonb'
)
for sid, name, role in SEED:
    safe_name = name.replace("'", "''")
    lines.append(
        "INSERT INTO platform.skills (id, name, role_name, status, mastery)\n"
        f"VALUES ('{sid}', '{safe_name}', '{role}', 'approved', {empty_mastery})\n"
        "ON CONFLICT (id) DO NOTHING;"
    )

lines += [
    "",
    "-- Wipe under-mapped roles (< 3 skills) then insert a fresh 3–4 skill matrix.",
    "CREATE TEMP TABLE _role_seed AS",
    "SELECT r.id AS role_id, r.name AS role_name, COALESCE(d.name, '') AS department_name",
    "FROM platform.roles r",
    "LEFT JOIN platform.departments d ON d.id = r.department_id",
    "WHERE r.archived_at IS NULL",
    "  AND (",
    "    SELECT count(*) FROM platform.role_skills rs WHERE rs.role_id = r.id",
    "  ) < 3;",
    "",
    "DELETE FROM platform.role_skill_expectations e",
    "USING _role_seed s WHERE e.role_id = s.role_id;",
    "DELETE FROM platform.role_skills rs",
    "USING _role_seed s WHERE rs.role_id = s.role_id;",
    "",
]

# We can't call Python family mapping inside SQL easily without embedding a
# CASE expression. Build a VALUES list of (role_name_lower, skill_id, weight)
# keyed by role name from a second pass that the remote bash fills.
# Instead: emit a DO block that uses a JSON map generated here from a role dump.
# Simpler approach: emit SQL that uses CASE on department_name + role name patterns.

# Build CASE arms that return a text[] of skill ids.
def skill_array_sql(skills: list[str]) -> str:
    quoted = ",".join(f"'{s}'" for s in skills)
    return f"ARRAY[{quoted}]::text[]"


# Pattern → skills, ordered most-specific first. Applied in a SQL CASE.
# We'll generate per-role updates after fetching roles on the remote side —
# this local generator alone can't know role names. So write a hybrid:
# the shell uploads this skeleton + a companion Python mapper that runs remotely
# with role rows from psql.
#
# For a self-contained file, use department CASE in SQL.

dept_cases = [
    (("Finance & Audit",), FAMILY_SKILLS["finance"]),
    (("Technology",), FAMILY_SKILLS["technology"]),
    (("Product & Growth", "Business Intelligence"), FAMILY_SKILLS["product"]),
    (
        (
            "Marketing",
            "FundedNext | Marketing",
            "FNmarkets | Marketing",
            "Community & Partner Management",
        ),
        FAMILY_SKILLS["marketing"],
    ),
    (("People & Culture",), FAMILY_SKILLS["people"]),
    (("Client Experience - FundedNext",), FAMILY_SKILLS["cx"]),
    (
        (
            "Operations",
            "Operations - FundedNext",
            "Operations - FNmarkets",
            "Sri Lanka Operations",
            "Office of Project Management",
            "Admin, Compliance & Corporate Affairs",
            "NEXT | Quality, Performance & Training",
            "CEO's Office",
        ),
        FAMILY_SKILLS["operations"],
    ),
    (("Sales", "Business Development"), FAMILY_SKILLS["sales"]),
    (
        (
            "Trading & Risk Management",
            "Trading & Risk Operations",
            "FNmarkets | Trading & Risk Operations",
        ),
        FAMILY_SKILLS["risk"],
    ),
    (("Legal & Compliance",), FAMILY_SKILLS["legal"]),
    (("Payments & Treasury", "NEXT | Payments & Treasury"), FAMILY_SKILLS["payments"]),
    (("LT Teams",), FAMILY_SKILLS["leadership"]),
]

lines.append("-- Map skills by department family (manager roles get leadership extras in a second pass).")
lines.append("CREATE TEMP TABLE _role_skills_pick (")
lines.append("  role_id text PRIMARY KEY,")
lines.append("  skill_ids text[] NOT NULL")
lines.append(");")
lines.append("")
lines.append("INSERT INTO _role_skills_pick (role_id, skill_ids)")
lines.append("SELECT s.role_id,")
lines.append("  CASE")

for depts, skills in dept_cases:
    in_list = ", ".join("'" + d.replace("'", "''") + "'" for d in depts)
    lines.append(f"    WHEN s.department_name IN ({in_list}) THEN {skill_array_sql(skills)}")

lines.append(f"    ELSE {skill_array_sql(FAMILY_SKILLS['default'])}")
lines.append("  END")
lines.append("FROM _role_seed s;")
lines.append("")

# Manager bump: prepend leadership skills when role name looks managerial.
lines.append(
    "UPDATE _role_skills_pick p\n"
    "SET skill_ids = (\n"
    "  SELECT ARRAY(\n"
    "    SELECT x\n"
    "    FROM unnest(\n"
    "      ARRAY['skill-people-leadership','skill-coaching']::text[] || p.skill_ids\n"
    "    ) WITH ORDINALITY AS t(x, ord)\n"
    "    GROUP BY x\n"
    "    ORDER BY min(ord)\n"
    "    LIMIT 4\n"
    "  )\n"
    ")\n"
    "FROM _role_seed s\n"
    "WHERE p.role_id = s.role_id\n"
    "  AND lower(s.role_name) ~ '(manager|lead[, ]|head of|director|chief|captain|(^|[^a-z])hod([^a-z]|$))';"
)
lines.append("")

# Insert role_skills with equal weights.
lines.append(
    "INSERT INTO platform.role_skills (role_id, skill_id, weight_pct)\n"
    "SELECT p.role_id,\n"
    "       skill_id,\n"
    "       ROUND(100.0 / cardinality(p.skill_ids))::int\n"
    "FROM _role_skills_pick p\n"
    "CROSS JOIN LATERAL unnest(p.skill_ids) AS skill_id;"
)
lines.append("")

# Fix rounding so weights sum to 100: bump first skill by remainder.
lines.append(
    "WITH totals AS (\n"
    "  SELECT role_id, sum(weight_pct)::int AS total\n"
    "  FROM platform.role_skills\n"
    "  WHERE role_id IN (SELECT role_id FROM _role_seed)\n"
    "  GROUP BY role_id\n"
    "),\n"
    "first_skill AS (\n"
    "  SELECT DISTINCT ON (rs.role_id) rs.role_id, rs.skill_id\n"
    "  FROM platform.role_skills rs\n"
    "  JOIN _role_seed s ON s.role_id = rs.role_id\n"
    "  ORDER BY rs.role_id, rs.skill_id\n"
    ")\n"
    "UPDATE platform.role_skills rs\n"
    "SET weight_pct = rs.weight_pct + (100 - t.total)\n"
    "FROM totals t\n"
    "JOIN first_skill f ON f.role_id = t.role_id\n"
    "WHERE rs.role_id = f.role_id\n"
    "  AND rs.skill_id = f.skill_id\n"
    "  AND t.total <> 100;"
)
lines.append("")

# Expectations by grade for every seeded role_skill.
grade_values = ",\n  ".join(
    f"('{grade}', '{level}')" for grade, level in GRADES
)
lines.append(
    "INSERT INTO platform.role_skill_expectations (\n"
    "  role_id, skill_id, job_grade, expected_level, description\n"
    ")\n"
    "SELECT rs.role_id, rs.skill_id, g.job_grade, g.expected_level, ''\n"
    "FROM platform.role_skills rs\n"
    "JOIN _role_seed s ON s.role_id = rs.role_id\n"
    "CROSS JOIN (VALUES\n"
    f"  {grade_values}\n"
    ") AS g(job_grade, expected_level);"
)
lines.append("")
lines.append(
    "SELECT 'roles_seeded' AS metric, count(*)::text AS value FROM _role_seed\n"
    "UNION ALL\n"
    "SELECT 'role_skill_rows', count(*)::text\n"
    "FROM platform.role_skills\n"
    "WHERE role_id IN (SELECT role_id FROM _role_seed);"
)
lines.append("")
lines.append("COMMIT;")

out.write_text("\n".join(lines) + "\n")
print(f"Wrote {out} ({out.stat().st_size} bytes)")
PY

echo "[seed-role-skills] Uploading SQL → $HOST:$REMOTE_SQL …"
"${RSYNC[@]}" "$SQL_LOCAL" "$HOST:$REMOTE_SQL"

echo "[seed-role-skills] Applying on RDS …"
"${SSH[@]}" bash -s -- "$REMOTE_APP_DIR" "$REMOTE_SQL" <<'REMOTE'
set -euo pipefail
APP_DIR="$1"
SQL_FILE="$2"
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

psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo ""
echo "[seed-role-skills] Verification:"
psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_NAME" -Atc "
SELECT
  'roles_with_skills=' || count(*) FILTER (WHERE c >= 1)
  || ' roles_with_3plus=' || count(*) FILTER (WHERE c >= 3)
  || ' roles_empty=' || count(*) FILTER (WHERE c = 0)
  || ' of ' || count(*)
FROM (
  SELECT r.id, (
    SELECT count(*) FROM platform.role_skills rs WHERE rs.role_id = r.id
  ) AS c
  FROM platform.roles r
  WHERE r.archived_at IS NULL
) t;
"
REMOTE

echo "[seed-role-skills] Done."
