-- Revolut People "specialisation" as a first-class employee role
-- (example: Web Developer, QA Engineer). Distinct from job_title / job_grade.

ALTER TABLE platform.employees
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN platform.employees.role IS
  'Functional role from Revolut specialisation (e.g. QA Engineer).';
