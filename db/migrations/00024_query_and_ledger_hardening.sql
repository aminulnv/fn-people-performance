-- Hot-path index for goal progress loads, and close the TRUNCATE hole on
-- the append-only activity ledger. Also lock email uniqueness the way the
-- API already looks people up.

CREATE INDEX IF NOT EXISTS goal_progress_entries_goal_idx
  ON platform.goal_progress_entries (goal_id, measurement_id, recorded_at);

DROP TRIGGER IF EXISTS activity_events_no_truncate ON platform.activity_events;
CREATE TRIGGER activity_events_no_truncate
  BEFORE TRUNCATE ON platform.activity_events
  FOR EACH STATEMENT
  EXECUTE PROCEDURE platform.reject_activity_event_mutation();

CREATE UNIQUE INDEX IF NOT EXISTS employees_email_lower_key
  ON platform.employees (lower(email));

CREATE OR REPLACE FUNCTION platform.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'access_profiles',
    'departments',
    'divisions',
    'employees',
    'goal_measurements',
    'goal_submissions',
    'goals',
    'notification_deliveries',
    'notifications',
    'review_answers',
    'review_cycle_groups',
    'review_cycles',
    'review_packets',
    'review_pillar_scores',
    'teams'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS touch_updated_at ON platform.%I',
      target_table
    );
    EXECUTE format(
      'CREATE TRIGGER touch_updated_at
         BEFORE UPDATE ON platform.%I
         FOR EACH ROW
         EXECUTE PROCEDURE platform.touch_updated_at()',
      target_table
    );
  END LOOP;
END
$$;
