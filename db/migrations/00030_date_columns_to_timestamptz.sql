-- Store every date field as a UTC timestamp. Existing DATE values become midnight UTC.

ALTER TABLE platform.review_cycles
  ALTER COLUMN start_date TYPE TIMESTAMPTZ
    USING (start_date::timestamp WITHOUT TIME ZONE AT TIME ZONE 'UTC'),
  ALTER COLUMN end_date TYPE TIMESTAMPTZ
    USING (end_date::timestamp WITHOUT TIME ZONE AT TIME ZONE 'UTC');

ALTER TABLE platform.employees
  ALTER COLUMN joining_date TYPE TIMESTAMPTZ
    USING (
      CASE
        WHEN joining_date IS NULL THEN NULL
        ELSE joining_date::timestamp WITHOUT TIME ZONE AT TIME ZONE 'UTC'
      END
    );
