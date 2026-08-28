-- Employees must explain why a goal set is submitted after the deadline.

ALTER TABLE platform.goal_submissions
  ADD COLUMN IF NOT EXISTS late_justification TEXT NULL;
