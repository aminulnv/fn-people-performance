-- Rename skill status: approved → active, draft → inactive.

ALTER TABLE platform.skills
  DROP CONSTRAINT IF EXISTS skills_status_check;

UPDATE platform.skills
SET status = CASE status
  WHEN 'approved' THEN 'active'
  WHEN 'draft' THEN 'inactive'
  ELSE status
END
WHERE status IN ('approved', 'draft');

ALTER TABLE platform.skills
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE platform.skills
  ADD CONSTRAINT skills_status_check
  CHECK (status IN ('active', 'inactive'));
