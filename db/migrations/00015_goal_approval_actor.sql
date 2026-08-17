-- Preserve who gave the final approval so the UI never guesses from org roles.

ALTER TABLE platform.goal_submissions
  ADD COLUMN IF NOT EXISTS approved_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL;

ALTER TABLE platform.goal_submissions
  ADD COLUMN IF NOT EXISTS approved_by_name TEXT NULL;
