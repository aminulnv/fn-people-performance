-- Career facts that employees.job_grade cannot hold.
-- job_grade stays the current snapshot. History and PIPs live here.
-- Backfill treats the current grade as held since joining. That is not a promotion.

CREATE TABLE IF NOT EXISTS platform.employee_grade_changes (
  id BIGSERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  job_grade TEXT NOT NULL,
  effective_on DATE NOT NULL,
  change_kind TEXT NOT NULL
    CHECK (change_kind IN ('hire', 'promotion', 'lateral', 'demotion')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_grade_changes_employee_idx
  ON platform.employee_grade_changes (employee_id, effective_on DESC, id DESC);

CREATE TABLE IF NOT EXISTS platform.employee_pips (
  id BIGSERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  started_on DATE NOT NULL,
  ended_on DATE,
  status TEXT NOT NULL
    CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ended_on IS NULL OR ended_on >= started_on),
  CHECK (
    (status = 'active' AND ended_on IS NULL)
    OR (status IN ('completed', 'cancelled') AND ended_on IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_pips_one_active
  ON platform.employee_pips (employee_id)
  WHERE status = 'active';

INSERT INTO platform.employee_grade_changes (
  employee_id, job_grade, effective_on, change_kind
)
SELECT employee_id, btrim(job_grade), joining_date, 'hire'
FROM platform.employees
WHERE btrim(coalesce(job_grade, '')) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM platform.employee_grade_changes existing
    WHERE existing.employee_id = platform.employees.employee_id
  );
