-- Replace vague reminder timing copy with fixed day counts.

UPDATE platform.notification_rules
SET
  name = 'Review due in 3 days',
  when_label = '3 days before a review is due',
  updated_at = NOW()
WHERE event_key = 'review.due_soon';

UPDATE platform.notification_rules
SET
  name = 'Calibration closes in 3 days',
  when_label = '3 days before calibration closes',
  updated_at = NOW()
WHERE event_key = 'review.calibration.due_soon';

UPDATE platform.notification_rules
SET
  name = 'Update goal results (14 days before cycle end)',
  when_label = '14 days before the cycle ends',
  updated_at = NOW()
WHERE event_key = 'goal.results_reminder';

UPDATE platform.notification_rules
SET
  name = 'Stale progress on the team (14 days)',
  when_label = 'When reports have no progress update for 14 days',
  updated_at = NOW()
WHERE event_key = 'goal.team.stale_summary';
