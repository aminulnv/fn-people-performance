-- Departments → teams → employees (ID FKs).
-- Create order avoids circular FK issues; department HOD/HRBP added after employees.

CREATE TABLE IF NOT EXISTS platform.departments (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  head_employee_id INTEGER NULL,
  hrbp_employee_id INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT departments_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS platform.employees (
  employee_id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  joining_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  job_title TEXT NOT NULL DEFAULT '',
  job_grade TEXT NOT NULL DEFAULT '',
  department_id BIGINT NULL REFERENCES platform.departments (id),
  team_id BIGINT NULL,
  reports_to_employee_id INTEGER NULL REFERENCES platform.employees (employee_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employees_email_key UNIQUE (email),
  CONSTRAINT employees_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT employees_employee_id_positive CHECK (employee_id > 0),
  CONSTRAINT employees_no_self_report CHECK (
    reports_to_employee_id IS NULL
    OR reports_to_employee_id <> employee_id
  )
);

CREATE TABLE IF NOT EXISTS platform.teams (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES platform.departments (id),
  name TEXT NOT NULL,
  manager_employee_id INTEGER NULL REFERENCES platform.employees (employee_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teams_department_name_key UNIQUE (department_id, name)
);

-- Department role FKs (nullable; set after employees exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_head_employee_id_fkey'
      AND conrelid = 'platform.departments'::regclass
  ) THEN
    ALTER TABLE platform.departments
      ADD CONSTRAINT departments_head_employee_id_fkey
      FOREIGN KEY (head_employee_id) REFERENCES platform.employees (employee_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_hrbp_employee_id_fkey'
      AND conrelid = 'platform.departments'::regclass
  ) THEN
    ALTER TABLE platform.departments
      ADD CONSTRAINT departments_hrbp_employee_id_fkey
      FOREIGN KEY (hrbp_employee_id) REFERENCES platform.employees (employee_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_team_id_fkey'
      AND conrelid = 'platform.employees'::regclass
  ) THEN
    ALTER TABLE platform.employees
      ADD CONSTRAINT employees_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES platform.teams (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS employees_department_id_idx
  ON platform.employees (department_id);

CREATE INDEX IF NOT EXISTS employees_team_id_idx
  ON platform.employees (team_id);

CREATE INDEX IF NOT EXISTS employees_reports_to_employee_id_idx
  ON platform.employees (reports_to_employee_id);

CREATE INDEX IF NOT EXISTS teams_department_id_idx
  ON platform.teams (department_id);

CREATE INDEX IF NOT EXISTS teams_manager_employee_id_idx
  ON platform.teams (manager_employee_id);

CREATE INDEX IF NOT EXISTS departments_head_employee_id_idx
  ON platform.departments (head_employee_id);

CREATE INDEX IF NOT EXISTS departments_hrbp_employee_id_idx
  ON platform.departments (hrbp_employee_id);
