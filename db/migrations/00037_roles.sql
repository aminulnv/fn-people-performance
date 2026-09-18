-- Role catalog + competency matrix (skill × job grade).
-- People inherit skills from their role; employee_skills stays as extras.

CREATE TABLE IF NOT EXISTS platform.roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department_id BIGINT NULL
    REFERENCES platform.departments (id) ON DELETE SET NULL,
  owner_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_name_lower_uidx
  ON platform.roles (lower(name));

CREATE INDEX IF NOT EXISTS roles_department_idx
  ON platform.roles (department_id)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS platform.role_skills (
  role_id TEXT NOT NULL
    REFERENCES platform.roles (id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL
    REFERENCES platform.skills (id) ON DELETE CASCADE,
  weight_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
  PRIMARY KEY (role_id, skill_id)
);

CREATE INDEX IF NOT EXISTS role_skills_skill_idx
  ON platform.role_skills (skill_id);

CREATE TABLE IF NOT EXISTS platform.role_skill_expectations (
  role_id TEXT NOT NULL
    REFERENCES platform.roles (id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL
    REFERENCES platform.skills (id) ON DELETE CASCADE,
  job_grade TEXT NOT NULL,
  expected_level TEXT NOT NULL DEFAULT 'none'
    CHECK (expected_level IN (
      'none',
      'basic',
      'intermediate',
      'advanced',
      'expert'
    )),
  PRIMARY KEY (role_id, skill_id, job_grade),
  CONSTRAINT role_skill_expectations_matrix_fk
    FOREIGN KEY (role_id, skill_id)
    REFERENCES platform.role_skills (role_id, skill_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS role_skill_expectations_skill_idx
  ON platform.role_skill_expectations (skill_id);

ALTER TABLE platform.employees
  ADD COLUMN IF NOT EXISTS role_id TEXT NULL
    REFERENCES platform.roles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employees_role_id_idx
  ON platform.employees (role_id)
  WHERE role_id IS NOT NULL;

COMMENT ON COLUMN platform.employees.role_id IS
  'Catalog role (job family). Display name stays in employees.role.';

COMMENT ON COLUMN platform.employees.role IS
  'Denormalized role name; kept in lockstep with platform.roles.name when role_id is set.';

-- Distinct non-empty role strings → catalog rows, then attach role_id.
INSERT INTO platform.roles (id, name)
SELECT
  'role-' || md5(lower(trim(src.role_name))),
  trim(src.role_name)
FROM (
  SELECT DISTINCT role AS role_name
  FROM platform.employees
  WHERE role IS NOT NULL AND trim(role) <> ''
) src
WHERE NOT EXISTS (
  SELECT 1
  FROM platform.roles existing
  WHERE lower(existing.name) = lower(trim(src.role_name))
);

UPDATE platform.employees e
SET role_id = r.id
FROM platform.roles r
WHERE e.role_id IS NULL
  AND trim(e.role) <> ''
  AND lower(trim(e.role)) = lower(r.name);
