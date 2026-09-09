-- Preserve Revolut team identity and lifecycle metadata in platform.teams.

ALTER TABLE platform.teams
  ADD COLUMN IF NOT EXISTS revolut_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS revolut_department_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS revolut_owner_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS team_function TEXT NULL,
  ADD COLUMN IF NOT EXISTS mission TEXT NULL,
  ADD COLUMN IF NOT EXISTS revolut_updated_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teams_revolut_id_key
  ON platform.teams (revolut_id)
  WHERE revolut_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teams_status_check'
      AND conrelid = 'platform.teams'::regclass
  ) THEN
    ALTER TABLE platform.teams
      ADD CONSTRAINT teams_status_check
      CHECK (status IN ('active', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teams_team_function_check'
      AND conrelid = 'platform.teams'::regclass
  ) THEN
    ALTER TABLE platform.teams
      ADD CONSTRAINT teams_team_function_check
      CHECK (team_function IS NULL OR team_function IN ('product', 'service'));
  END IF;
END $$;
