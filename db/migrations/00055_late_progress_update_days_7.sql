-- Default late progress grace window: 30 → 7 days (all teams).
-- Missing key also becomes 7.

UPDATE platform.review_cycles
SET goal_count_policy = jsonb_set(
  COALESCE(goal_count_policy, '{}'::jsonb),
  '{lateProgressUpdateDays}',
  '7'::jsonb,
  true
)
WHERE goal_count_policy IS NULL
   OR goal_count_policy->>'lateProgressUpdateDays' IS NULL
   OR (goal_count_policy->>'lateProgressUpdateDays')::int = 30;

UPDATE platform.review_cycle_groups
SET goal_count_policy = jsonb_set(
  COALESCE(goal_count_policy, '{}'::jsonb),
  '{lateProgressUpdateDays}',
  '7'::jsonb,
  true
)
WHERE goal_count_policy IS NULL
   OR goal_count_policy->>'lateProgressUpdateDays' IS NULL
   OR (goal_count_policy->>'lateProgressUpdateDays')::int = 30;
