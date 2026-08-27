-- Purpose is inferred from period_key and cycle_type. Stop storing it.

ALTER TABLE platform.review_cycles
  DROP CONSTRAINT IF EXISTS review_cycles_purpose_check;

ALTER TABLE platform.review_cycles
  DROP COLUMN IF EXISTS purpose;
