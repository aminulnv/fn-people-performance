-- Calibration sitting notes, status, and clean confirmation.
-- Separate from review packets so a historical calibrated grade is not "adjusted this sitting".

CREATE TABLE IF NOT EXISTS platform.calibration_sittings (
  cycle_id TEXT PRIMARY KEY
    REFERENCES platform.review_cycles (id) ON DELETE CASCADE,
  clean_confirmed_at TIMESTAMPTZ,
  clean_confirmed_by_employee_id INTEGER
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.calibration_sitting_employees (
  cycle_id TEXT NOT NULL
    REFERENCES platform.review_cycles (id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_reviewed'
    CHECK (status IN ('not_reviewed', 'discussed', 'confirmed')),
  notes TEXT NOT NULL DEFAULT '',
  adjusted_at TIMESTAMPTZ,
  updated_by_employee_id INTEGER
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cycle_id, employee_id)
);
