-- Per-employee department head; team owner rename; joining_date optional.

ALTER TABLE platform.employees
  ALTER COLUMN joining_date DROP NOT NULL;

ALTER TABLE platform.employees
  ADD COLUMN IF NOT EXISTS department_head_employee_id INTEGER NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_department_head_employee_id_fkey'
      AND conrelid = 'platform.employees'::regclass
  ) THEN
    ALTER TABLE platform.employees
      ADD CONSTRAINT employees_department_head_employee_id_fkey
      FOREIGN KEY (department_head_employee_id)
      REFERENCES platform.employees (employee_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS employees_department_head_employee_id_idx
  ON platform.employees (department_head_employee_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'platform'
      AND table_name = 'teams'
      AND column_name = 'manager_employee_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'platform'
      AND table_name = 'teams'
      AND column_name = 'owner_employee_id'
  ) THEN
    ALTER TABLE platform.teams
      RENAME COLUMN manager_employee_id TO owner_employee_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'platform' AND c.relname = 'teams_manager_employee_id_idx'
  ) THEN
    ALTER INDEX platform.teams_manager_employee_id_idx
      RENAME TO teams_owner_employee_id_idx;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS teams_owner_employee_id_idx
  ON platform.teams (owner_employee_id);
