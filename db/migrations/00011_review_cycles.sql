-- Versioned Review Cycle configuration. Soft-deleted rows stay for Activity / FK integrity.

CREATE TABLE IF NOT EXISTS platform.review_cycles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cycle_type TEXT NOT NULL
    CHECK (cycle_type IN ('regular', 'ad-hoc')),
  period_key TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_test BOOLEAN NOT NULL DEFAULT false,
  source_cycle_id TEXT NULL
    REFERENCES platform.review_cycles (id) ON DELETE SET NULL,
  stages_config JSONB NOT NULL,
  review_types JSONB NOT NULL,
  goal_count_policy JSONB NOT NULL,
  post_window_goal_policy TEXT NOT NULL
    CHECK (post_window_goal_policy IN ('hard_stop', 'two_tier_approval')),
  auto_scorecard_generation BOOLEAN NOT NULL DEFAULT false,
  calibration_config JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NULL,
  CHECK (start_date <= end_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS review_cycles_active_period_key_idx
  ON platform.review_cycles (period_key)
  WHERE deleted_at IS NULL
    AND cycle_type = 'regular'
    AND period_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS review_cycles_list_idx
  ON platform.review_cycles (deleted_at, start_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS platform.review_cycle_grade_exclusions (
  cycle_id TEXT NOT NULL
    REFERENCES platform.review_cycles (id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cycle_id, employee_id)
);
