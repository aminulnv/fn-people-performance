-- When the manager review deadline passes with no submission, the packet
-- force-moves to calibration and HOD can set the final rating.

ALTER TABLE platform.review_packets
  ADD COLUMN IF NOT EXISTS manager_missed_deadline BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE platform.review_packets
  ADD COLUMN IF NOT EXISTS manager_force_moved_at TIMESTAMPTZ;
