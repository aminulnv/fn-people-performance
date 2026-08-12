-- Divisions catalog + employee FK (like departments).

CREATE TABLE IF NOT EXISTS platform.divisions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT divisions_name_key UNIQUE (name)
);

INSERT INTO platform.divisions (name)
VALUES
  ('FundedNext'),
  ('FNmarkets'),
  ('NEXT Group')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE platform.employees
  ADD COLUMN IF NOT EXISTS division_id BIGINT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_division_id_fkey'
      AND conrelid = 'platform.employees'::regclass
  ) THEN
    ALTER TABLE platform.employees
      ADD CONSTRAINT employees_division_id_fkey
      FOREIGN KEY (division_id) REFERENCES platform.divisions (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS employees_division_id_idx
  ON platform.employees (division_id);
