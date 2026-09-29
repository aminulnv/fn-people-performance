-- Self-review and manager review run at the same time.
-- This timestamp is the self-review submit, independent of packet status.

ALTER TABLE platform.review_packets
  ADD COLUMN IF NOT EXISTS self_submitted_at TIMESTAMPTZ NULL;

-- Older rows moved forward only after the self-review was submitted.
UPDATE platform.review_packets
SET self_submitted_at = updated_at
WHERE self_submitted_at IS NULL
  AND status IN (
    'self_submitted',
    'manager_in_progress',
    'manager_submitted',
    'in_calibration',
    'calibrated',
    'released_to_managers',
    'released_to_employees',
    'appealed'
  );
