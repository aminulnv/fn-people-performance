-- Rename manager covers → responsibility delegations.
-- No-ops when 00026 already created the new names.

DO $$
BEGIN
  IF to_regclass('platform.manager_covers') IS NOT NULL
     AND to_regclass('platform.manager_delegations') IS NULL THEN
    ALTER TABLE platform.manager_covers RENAME TO manager_delegations;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'platform'
      AND table_name = 'manager_delegations'
      AND column_name = 'cover_employee_id'
  ) THEN
    ALTER TABLE platform.manager_delegations
      RENAME COLUMN cover_employee_id TO delegate_employee_id;
  END IF;
END $$;

ALTER INDEX IF EXISTS platform.manager_covers_absent_idx
  RENAME TO manager_delegations_absent_idx;
ALTER INDEX IF EXISTS platform.manager_covers_cover_idx
  RENAME TO manager_delegations_delegate_idx;
