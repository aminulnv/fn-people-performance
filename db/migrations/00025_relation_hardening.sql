-- Tighten relations that the API already treats as real:
-- notification cycle/goal/person refs, cycle delete rules, and group membership
-- that must stay on the same cycle as its group. Drop the unused legacy
-- review_cycles.source_cycle_id column (source links live in review_cycle_sources).

ALTER TABLE platform.notifications
  DROP CONSTRAINT IF EXISTS notifications_cycle_id_fkey;
ALTER TABLE platform.notifications
  ADD CONSTRAINT notifications_cycle_id_fkey
  FOREIGN KEY (cycle_id)
  REFERENCES platform.review_cycles (id)
  ON DELETE SET NULL;

ALTER TABLE platform.notifications
  DROP CONSTRAINT IF EXISTS notifications_goal_id_fkey;
ALTER TABLE platform.notifications
  ADD CONSTRAINT notifications_goal_id_fkey
  FOREIGN KEY (goal_id)
  REFERENCES platform.goals (goal_id)
  ON DELETE SET NULL;

ALTER TABLE platform.notifications
  ALTER COLUMN person_id TYPE INTEGER
  USING (
    CASE
      WHEN person_id ~ '^[0-9]+$' THEN person_id::integer
      ELSE NULL
    END
  );

ALTER TABLE platform.notifications
  DROP CONSTRAINT IF EXISTS notifications_person_id_fkey;
ALTER TABLE platform.notifications
  ADD CONSTRAINT notifications_person_id_fkey
  FOREIGN KEY (person_id)
  REFERENCES platform.employees (employee_id)
  ON DELETE SET NULL;

ALTER TABLE platform.review_packets
  DROP CONSTRAINT IF EXISTS review_packets_cycle_id_fkey;
ALTER TABLE platform.review_packets
  ADD CONSTRAINT review_packets_cycle_id_fkey
  FOREIGN KEY (cycle_id)
  REFERENCES platform.review_cycles (id);

CREATE UNIQUE INDEX IF NOT EXISTS review_cycle_groups_id_cycle_idx
  ON platform.review_cycle_groups (id, cycle_id);

ALTER TABLE platform.review_cycle_group_members
  DROP CONSTRAINT IF EXISTS review_cycle_group_members_group_cycle_fkey;
ALTER TABLE platform.review_cycle_group_members
  ADD CONSTRAINT review_cycle_group_members_group_cycle_fkey
  FOREIGN KEY (group_id, cycle_id)
  REFERENCES platform.review_cycle_groups (id, cycle_id)
  ON DELETE CASCADE;

ALTER TABLE platform.review_cycles
  DROP CONSTRAINT IF EXISTS review_cycles_source_cycle_id_fkey;

ALTER TABLE platform.review_cycles
  DROP COLUMN IF EXISTS source_cycle_id;
