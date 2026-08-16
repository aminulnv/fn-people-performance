-- User-specific notification feed plus channel delivery outbox.
-- Domain workflows create these records in the same transaction as their state change.

CREATE TABLE IF NOT EXISTS platform.notifications (
  id BIGSERIAL PRIMARY KEY,
  event_key TEXT NOT NULL,
  recipient_employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  actor_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'target',
  kind TEXT NOT NULL
    CHECK (kind IN ('action', 'info', 'reminder', 'summary', 'security')),
  state TEXT NOT NULL DEFAULT 'unread'
    CHECK (state IN ('unread', 'read', 'completed', 'superseded')),
  destination TEXT NULL,
  dedupe_key TEXT NOT NULL,
  cycle_id TEXT NULL,
  person_id TEXT NULL,
  goal_id TEXT NULL,
  due_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipient_employee_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS notifications_recipient_feed_idx
  ON platform.notifications (
    recipient_employee_id,
    state,
    updated_at DESC
  );

CREATE INDEX IF NOT EXISTS notifications_open_actions_idx
  ON platform.notifications (recipient_employee_id, due_at)
  WHERE kind = 'action' AND state IN ('unread', 'read');

CREATE TABLE IF NOT EXISTS platform.notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT NOT NULL
    REFERENCES platform.notifications (id) ON DELETE CASCADE,
  channel TEXT NOT NULL
    CHECK (channel IN ('in_app', 'email', 'clickup')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'failed', 'not_configured')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notification_id, channel)
);

CREATE INDEX IF NOT EXISTS notification_delivery_outbox_idx
  ON platform.notification_deliveries (status, next_attempt_at)
  WHERE status IN ('pending', 'failed');
