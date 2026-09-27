-- Soft-archive for departments (teams already have status active|archived).
-- Allow reused names after archive via partial unique indexes.

ALTER TABLE platform.departments
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

ALTER TABLE platform.departments
  DROP CONSTRAINT IF EXISTS departments_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS departments_name_active_uidx
  ON platform.departments (lower(name))
  WHERE archived_at IS NULL;

ALTER TABLE platform.teams
  DROP CONSTRAINT IF EXISTS teams_department_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS teams_department_name_active_uidx
  ON platform.teams (department_id, name)
  WHERE status = 'active';
