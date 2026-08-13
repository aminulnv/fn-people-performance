-- Employee work site (HiBob Site), e.g. NEXT Ventures Bangladesh.

ALTER TABLE platform.employees
  ADD COLUMN IF NOT EXISTS site TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS employees_site_idx
  ON platform.employees (site);
