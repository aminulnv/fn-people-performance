-- Group milestone measurements into separate checklist cards.

ALTER TABLE platform.goal_measurements
  ADD COLUMN IF NOT EXISTS list_title TEXT NULL,
  ADD COLUMN IF NOT EXISTS list_id TEXT NULL;
