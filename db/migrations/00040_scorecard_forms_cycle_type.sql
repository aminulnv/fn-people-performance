-- Scorecard forms are typed by cycle kind (Quarterly / Annual / Custom).

ALTER TABLE platform.scorecard_forms
  ADD COLUMN IF NOT EXISTS cycle_type TEXT;

UPDATE platform.scorecard_forms
SET cycle_type = CASE
  WHEN id IN (
    'form-q1-checkin',
    'form-q2-checkin',
    'form-q3-checkin',
    'form-q4-progress'
  ) THEN 'quarterly_checkin'
  WHEN id = 'form-annual-appraisal' THEN 'annual_appraisal'
  ELSE 'custom'
END
WHERE cycle_type IS NULL
   OR cycle_type NOT IN ('quarterly_checkin', 'annual_appraisal', 'custom');

ALTER TABLE platform.scorecard_forms
  ALTER COLUMN cycle_type SET DEFAULT 'custom';

ALTER TABLE platform.scorecard_forms
  ALTER COLUMN cycle_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scorecard_forms_cycle_type_check'
      AND conrelid = 'platform.scorecard_forms'::regclass
  ) THEN
    ALTER TABLE platform.scorecard_forms
      ADD CONSTRAINT scorecard_forms_cycle_type_check
      CHECK (cycle_type IN ('quarterly_checkin', 'annual_appraisal', 'custom'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS scorecard_forms_cycle_type_idx
  ON platform.scorecard_forms (deleted_at, cycle_type, lower(name), created_at DESC);
