-- Rename skill mastery / grade level: poor → unsatisfactory.

-- Mastery rubric JSON keys on the skills library.
UPDATE platform.skills
SET mastery =
  (mastery - 'poor')
  || jsonb_build_object(
    'unsatisfactory',
    COALESCE(mastery->'unsatisfactory', mastery->'poor', '""'::jsonb)
  )
WHERE mastery ? 'poor';

-- Stored skill grades on review scorecards.
UPDATE platform.review_pillar_scores
SET grade = 'unsatisfactory'
WHERE grade = 'poor'
  AND pillar_id LIKE 'skill:%';

-- Role matrix expectations: allow Unsatisfactory, migrate any legacy poor rows.
ALTER TABLE platform.role_skill_expectations
  DROP CONSTRAINT IF EXISTS role_skill_expectations_expected_level_check;

UPDATE platform.role_skill_expectations
SET expected_level = 'unsatisfactory'
WHERE expected_level = 'poor';

ALTER TABLE platform.role_skill_expectations
  ADD CONSTRAINT role_skill_expectations_expected_level_check
  CHECK (
    expected_level IN (
      'none',
      'unsatisfactory',
      'basic',
      'intermediate',
      'advanced',
      'expert'
    )
  );
