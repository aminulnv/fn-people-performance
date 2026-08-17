-- Activity rows are immutable historical facts. Employee lifecycle operations
-- must not attempt ON DELETE SET NULL updates against the append-only ledger.

ALTER TABLE platform.schema_migrations
  ADD COLUMN IF NOT EXISTS checksum TEXT;

ALTER TABLE platform.activity_events
  DROP CONSTRAINT IF EXISTS activity_events_actor_employee_id_fkey;

ALTER TABLE platform.activity_events
  DROP CONSTRAINT IF EXISTS activity_events_subject_employee_id_fkey;
