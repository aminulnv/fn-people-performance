-- Rename roles.mission → description (for DBs that already applied the old 00038).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'platform'
      AND table_name = 'roles'
      AND column_name = 'mission'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'platform'
      AND table_name = 'roles'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE platform.roles RENAME COLUMN mission TO description;
  END IF;
END $$;

COMMENT ON COLUMN platform.roles.description IS
  'Short summary of the goals and scope of the role.';
