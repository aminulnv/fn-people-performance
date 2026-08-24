-- Temporary responsibility delegation when a manager is absent.
-- Does not change reports_to. Original manager stays on the employee record.

CREATE TABLE IF NOT EXISTS platform.manager_delegations (
  id BIGSERIAL PRIMARY KEY,
  absent_employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  delegate_employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  assigned_by_employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE RESTRICT,
  revoked_at TIMESTAMPTZ NULL,
  revoked_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (absent_employee_id <> delegate_employee_id),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS manager_delegations_absent_idx
  ON platform.manager_delegations (absent_employee_id, revoked_at, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS manager_delegations_delegate_idx
  ON platform.manager_delegations (delegate_employee_id, revoked_at, starts_at, ends_at);
