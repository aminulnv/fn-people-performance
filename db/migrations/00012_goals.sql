-- Authoritative Goals domain. Activity events live in platform.activity_events.

CREATE TABLE IF NOT EXISTS platform.goal_submissions (
  cycle_id TEXT NOT NULL
    REFERENCES platform.review_cycles (id),
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id),
  status TEXT NOT NULL
    CHECK (status IN (
      'not_eligible', 'draft', 'submitted', 'sent_back', 'approved', 'incomplete'
    )),
  post_window_approval_stage TEXT NULL
    CHECK (post_window_approval_stage IN ('manager', 'manager_manager')),
  send_back_reason TEXT NULL,
  send_back_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  send_back_by_name TEXT NULL,
  manager_note TEXT NULL,
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  submitted_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cycle_id, employee_id)
);

CREATE TABLE IF NOT EXISTS platform.goals (
  goal_id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  employee_id INTEGER NOT NULL,
  owner_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  details TEXT NULL,
  goal_type TEXT NOT NULL DEFAULT 'outcome'
    CHECK (goal_type IN ('outcome', 'output')),
  process_type TEXT NOT NULL DEFAULT 'bau'
    CHECK (process_type IN ('okr', 'bau', 'pi')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  weight NUMERIC(8, 4) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  progress_status TEXT NULL
    CHECK (progress_status IN (
      'on_track', 'at_risk', 'off_track', 'on_hold', 'complete'
    )),
  cascaded_from_goal_id TEXT NULL
    REFERENCES platform.goals (goal_id) ON DELETE SET NULL,
  linked_goal_label TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (cycle_id, employee_id)
    REFERENCES platform.goal_submissions (cycle_id, employee_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS goals_submission_idx
  ON platform.goals (cycle_id, employee_id, position);

CREATE TABLE IF NOT EXISTS platform.goal_measurements (
  measurement_id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL
    REFERENCES platform.goals (goal_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('metric', 'milestone')),
  title TEXT NOT NULL DEFAULT '',
  weight NUMERIC(8, 4) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  unit TEXT NULL,
  direction TEXT NULL,
  start_value NUMERIC NULL,
  target_value NUMERIC NULL,
  current_value NUMERIC NULL,
  range_min NUMERIC NULL,
  range_max NUMERIC NULL,
  complete BOOLEAN NULL,
  proof_url TEXT NULL,
  comment TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goal_measurements_goal_idx
  ON platform.goal_measurements (goal_id, position);

CREATE TABLE IF NOT EXISTS platform.goal_comments (
  comment_id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL
    REFERENCES platform.goals (goal_id) ON DELETE CASCADE,
  author_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goal_comments_goal_idx
  ON platform.goal_comments (goal_id, created_at);

CREATE TABLE IF NOT EXISTS platform.goal_progress_entries (
  entry_id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL
    REFERENCES platform.goals (goal_id) ON DELETE CASCADE,
  measurement_id TEXT NOT NULL
    REFERENCES platform.goal_measurements (measurement_id) ON DELETE CASCADE,
  actor_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT '',
  measurement_label TEXT NULL,
  from_value NUMERIC NULL,
  to_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goal_progress_entries_measurement_idx
  ON platform.goal_progress_entries (measurement_id, recorded_at);

CREATE TABLE IF NOT EXISTS platform.goal_ratings (
  cycle_id TEXT NOT NULL,
  employee_id INTEGER NOT NULL,
  tier SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  submitted_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cycle_id, employee_id),
  FOREIGN KEY (cycle_id, employee_id)
    REFERENCES platform.goal_submissions (cycle_id, employee_id)
    ON DELETE CASCADE
);
