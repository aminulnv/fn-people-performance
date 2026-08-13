-- External avatar image URL (no file upload; set by ops/import).

ALTER TABLE platform.employees
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
