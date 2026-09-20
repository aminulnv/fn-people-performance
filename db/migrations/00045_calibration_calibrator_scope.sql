-- Calibrators can also be limited to one team or one person.

CREATE TABLE IF NOT EXISTS platform.team_calibrators (
  team_id BIGINT NOT NULL
    REFERENCES platform.teams (id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, employee_id)
);

CREATE TABLE IF NOT EXISTS platform.employee_calibrators (
  subject_employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_employee_id, employee_id),
  CONSTRAINT employee_calibrators_not_self
    CHECK (subject_employee_id <> employee_id)
);
