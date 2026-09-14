-- Reusable scorecard form documents (live-linked from cycle groups).

CREATE TABLE IF NOT EXISTS platform.scorecard_forms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NULL,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
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

CREATE INDEX IF NOT EXISTS scorecard_forms_list_idx
  ON platform.scorecard_forms (deleted_at, name, created_at DESC);

ALTER TABLE platform.review_cycle_groups
  ADD COLUMN IF NOT EXISTS scorecard_form_id TEXT NULL
    REFERENCES platform.scorecard_forms (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS review_cycle_groups_scorecard_form_idx
  ON platform.review_cycle_groups (scorecard_form_id)
  WHERE deleted_at IS NULL AND scorecard_form_id IS NOT NULL;
