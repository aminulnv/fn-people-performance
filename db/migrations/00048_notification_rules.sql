-- Admin-managed notification rules (config-over-catalogue).
-- One row per catalogue event_key. Emission respects enabled + channels.

CREATE TABLE IF NOT EXISTS platform.notification_rules (
  event_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('goals', 'reviews', 'organisation', 'access')),
  audience_key TEXT NOT NULL,
  audience_label TEXT NOT NULL,
  when_label TEXT NOT NULL,
  timing_kind TEXT NOT NULL
    CHECK (timing_kind IN ('immediate', 'reminder')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  channels TEXT[] NOT NULL
    CHECK (
      cardinality(channels) > 0
      AND channels <@ ARRAY['in_app', 'email', 'clickup']::text[]
    ),
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS notification_rules_category_idx
  ON platform.notification_rules (category, sort_order, name);
