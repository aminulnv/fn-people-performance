-- Remove redundant goal classification fields (type, process, priority).

ALTER TABLE platform.goals
  DROP COLUMN IF EXISTS goal_type,
  DROP COLUMN IF EXISTS process_type,
  DROP COLUMN IF EXISTS priority;
