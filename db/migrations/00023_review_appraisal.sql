-- Annual / custom cycle identity, configurable review policy, and persisted packets.

ALTER TABLE platform.review_cycles
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'quarterly_checkin',
  ADD COLUMN IF NOT EXISTS year_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS review_policy JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE platform.review_cycles
  DROP CONSTRAINT IF EXISTS review_cycles_purpose_check;

ALTER TABLE platform.review_cycles
  ADD CONSTRAINT review_cycles_purpose_check
  CHECK (purpose IN ('quarterly_checkin', 'annual_appraisal', 'custom'));

UPDATE platform.review_cycles
SET purpose = CASE
      WHEN period_key ~* '^annual-\d{4}$' THEN 'annual_appraisal'
      WHEN cycle_type = 'ad-hoc' THEN 'custom'
      ELSE 'quarterly_checkin'
    END,
    year_key = COALESCE(
      year_key,
      substring(period_key from '(\d{4})$'),
      to_char(start_date, 'YYYY')
    )
WHERE year_key IS NULL
   OR purpose = 'quarterly_checkin';

CREATE TABLE IF NOT EXISTS platform.review_cycle_sources (
  cycle_id TEXT NOT NULL
    REFERENCES platform.review_cycles (id) ON DELETE CASCADE,
  source_cycle_id TEXT NOT NULL
    REFERENCES platform.review_cycles (id) ON DELETE CASCADE,
  weight_percent INTEGER NOT NULL DEFAULT 25
    CHECK (weight_percent >= 0 AND weight_percent <= 100),
  excluded BOOLEAN NOT NULL DEFAULT false,
  transition_grade TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (cycle_id, source_cycle_id),
  CHECK (cycle_id <> source_cycle_id)
);

CREATE INDEX IF NOT EXISTS review_cycle_sources_source_idx
  ON platform.review_cycle_sources (source_cycle_id);

ALTER TABLE platform.review_cycle_groups
  ADD COLUMN IF NOT EXISTS review_policy JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS platform.review_packets (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL
    REFERENCES platform.review_cycles (id) ON DELETE CASCADE,
  group_id TEXT NULL
    REFERENCES platform.review_cycle_groups (id) ON DELETE SET NULL,
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  manager_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started',
      'self_in_progress',
      'self_submitted',
      'manager_in_progress',
      'manager_submitted',
      'in_calibration',
      'calibrated',
      'released_to_managers',
      'released_to_employees',
      'appealed'
    )),
  self_overall_grade TEXT NULL,
  manager_overall_grade TEXT NULL,
  calibrated_overall_grade TEXT NULL,
  published_overall_grade TEXT NULL,
  manager_override_reason TEXT NOT NULL DEFAULT '',
  goals_component JSONB NULL,
  first_viewed_at TIMESTAMPTZ NULL,
  released_to_manager_at TIMESTAMPTZ NULL,
  released_to_employee_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS review_packets_cycle_idx
  ON platform.review_packets (cycle_id, status);

CREATE INDEX IF NOT EXISTS review_packets_manager_idx
  ON platform.review_packets (manager_employee_id)
  WHERE manager_employee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform.review_answers (
  packet_id TEXT NOT NULL
    REFERENCES platform.review_packets (id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL
    CHECK (actor_role IN ('self', 'manager')),
  question_id TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (packet_id, actor_role, question_id)
);

CREATE TABLE IF NOT EXISTS platform.review_pillar_scores (
  packet_id TEXT NOT NULL
    REFERENCES platform.review_packets (id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL
    CHECK (actor_role IN ('self', 'manager')),
  pillar_id TEXT NOT NULL,
  grade TEXT NULL,
  comment TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (packet_id, actor_role, pillar_id)
);

CREATE TABLE IF NOT EXISTS platform.review_calibration_events (
  id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL
    REFERENCES platform.review_packets (id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  from_grade TEXT NULL,
  to_grade TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_calibration_events_packet_idx
  ON platform.review_calibration_events (packet_id, created_at);

CREATE TABLE IF NOT EXISTS platform.review_appeals (
  id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL
    REFERENCES platform.review_packets (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'recorded', 'resolved')),
  created_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL
);
