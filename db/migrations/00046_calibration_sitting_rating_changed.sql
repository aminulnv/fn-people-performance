-- Allow "rating_changed" on calibration sitting employees (HTML: Rating Changed).

ALTER TABLE platform.calibration_sitting_employees
  DROP CONSTRAINT IF EXISTS calibration_sitting_employees_status_check;

ALTER TABLE platform.calibration_sitting_employees
  ADD CONSTRAINT calibration_sitting_employees_status_check
  CHECK (
    status IN (
      'not_reviewed',
      'discussed',
      'confirmed',
      'rating_changed'
    )
  );
