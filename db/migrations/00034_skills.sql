-- Company skills library + per-employee assignments.

CREATE TABLE IF NOT EXISTS platform.skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  function_name TEXT NOT NULL DEFAULT '',
  role_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'draft')),
  created_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS skills_list_idx
  ON platform.skills (deleted_at, lower(name), created_at DESC);

CREATE TABLE IF NOT EXISTS platform.employee_skills (
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL
    REFERENCES platform.skills (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  PRIMARY KEY (employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS employee_skills_skill_idx
  ON platform.employee_skills (skill_id);

CREATE INDEX IF NOT EXISTS employee_skills_employee_idx
  ON platform.employee_skills (employee_id);
