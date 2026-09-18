-- Skill mastery rubrics (Poor → Expert). Used by competency matrix cells.

ALTER TABLE platform.skills
  ADD COLUMN IF NOT EXISTS mastery JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN platform.skills.mastery IS
  'Per-level write-ups: none/basic/intermediate/advanced/expert → text.';
