-- Append-only Activity Log for business and access-control changes.
-- Domain mutations write these rows in the same transaction as the state change.

CREATE TABLE IF NOT EXISTS platform.activity_events (
  id BIGSERIAL PRIMARY KEY,
  event_key TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  actor_name TEXT NOT NULL DEFAULT '',
  actor_type TEXT NOT NULL DEFAULT 'user'
    CHECK (actor_type IN ('user', 'system', 'import')),
  subject_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  cycle_id TEXT NULL,
  goal_id TEXT NULL,
  correlation_id TEXT NULL,
  request_id TEXT NULL,
  source TEXT NOT NULL DEFAULT 'api'
    CHECK (source IN ('api', 'web', 'scheduler', 'migration', 'import')),
  summary TEXT NOT NULL DEFAULT '',
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_entity_idx
  ON platform.activity_events (entity_type, entity_id, occurred_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS activity_events_subject_idx
  ON platform.activity_events (subject_employee_id, occurred_at DESC, id DESC)
  WHERE subject_employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS activity_events_actor_idx
  ON platform.activity_events (actor_employee_id, occurred_at DESC, id DESC)
  WHERE actor_employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS activity_events_cycle_idx
  ON platform.activity_events (cycle_id, occurred_at DESC, id DESC)
  WHERE cycle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS activity_events_goal_idx
  ON platform.activity_events (goal_id, occurred_at DESC, id DESC)
  WHERE goal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS activity_events_event_key_idx
  ON platform.activity_events (event_key, occurred_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS activity_events_correlation_idx
  ON platform.activity_events (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION platform.reject_activity_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'platform.activity_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS activity_events_no_update ON platform.activity_events;
CREATE TRIGGER activity_events_no_update
  BEFORE UPDATE ON platform.activity_events
  FOR EACH ROW
  EXECUTE PROCEDURE platform.reject_activity_event_mutation();

DROP TRIGGER IF EXISTS activity_events_no_delete ON platform.activity_events;
CREATE TRIGGER activity_events_no_delete
  BEFORE DELETE ON platform.activity_events
  FOR EACH ROW
  EXECUTE PROCEDURE platform.reject_activity_event_mutation();

INSERT INTO platform.access_profile_permissions (profile_key, permission_key)
VALUES
  ('admin_read', 'activity.read_all'),
  ('admin_write', 'activity.read_all'),
  ('admin_write', 'activity.export')
ON CONFLICT DO NOTHING;
