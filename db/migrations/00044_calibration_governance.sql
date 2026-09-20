-- Department calibrators and a freeze on the calibration sitting.
-- Overrides stay open until an admin locks the session.

ALTER TABLE platform.calibration_sittings
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by_employee_id INTEGER
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS platform.department_calibrators (
  department_id BIGINT NOT NULL
    REFERENCES platform.departments (id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (department_id, employee_id)
);
