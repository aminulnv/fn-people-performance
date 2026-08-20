-- Named people groups under a performance cycle. Each group owns a full
-- settings blob. A person can belong to at most one group per cycle.

CREATE TABLE IF NOT EXISTS platform.review_cycle_groups (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL
    REFERENCES platform.review_cycles (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
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
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS review_cycle_groups_cycle_idx
  ON platform.review_cycle_groups (cycle_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS platform.review_cycle_group_members (
  group_id TEXT NOT NULL
    REFERENCES platform.review_cycle_groups (id) ON DELETE CASCADE,
  cycle_id TEXT NOT NULL
    REFERENCES platform.review_cycles (id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, employee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS review_cycle_group_members_exclusive_idx
  ON platform.review_cycle_group_members (cycle_id, employee_id);
