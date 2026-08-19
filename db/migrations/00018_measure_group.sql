-- Group multiple milestone lists under one named measure.

ALTER TABLE platform.goal_measurements
  ADD COLUMN IF NOT EXISTS measure_group_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS measure_title TEXT NULL;

-- Existing lists become their own measure group.
UPDATE platform.goal_measurements
SET measure_group_id = COALESCE(list_id, measurement_id),
    measure_title = list_title
WHERE kind = 'milestone'
  AND measure_group_id IS NULL;
