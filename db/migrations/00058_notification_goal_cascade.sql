-- Dead goal targets should leave the inbox (CASCADE), not linger with a null goal_id.

ALTER TABLE platform.notifications
  DROP CONSTRAINT IF EXISTS notifications_goal_id_fkey;
ALTER TABLE platform.notifications
  ADD CONSTRAINT notifications_goal_id_fkey
  FOREIGN KEY (goal_id)
  REFERENCES platform.goals (goal_id)
  ON DELETE CASCADE;
