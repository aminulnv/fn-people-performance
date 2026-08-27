-- Rename stored cycle kind from ad-hoc to custom.

ALTER TABLE platform.review_cycles
  DROP CONSTRAINT IF EXISTS review_cycles_cycle_type_check;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'platform'
      AND rel.relname = 'review_cycles'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%cycle_type%'
      AND (
        pg_get_constraintdef(con.oid) ILIKE '%ad-hoc%'
        OR pg_get_constraintdef(con.oid) NOT ILIKE '%custom%'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE platform.review_cycles DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END $$;

UPDATE platform.review_cycles
SET cycle_type = 'custom'
WHERE cycle_type = 'ad-hoc';

ALTER TABLE platform.review_cycles
  ADD CONSTRAINT review_cycles_cycle_type_check
  CHECK (cycle_type IN ('regular', 'custom'));
