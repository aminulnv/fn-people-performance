-- Role preview fields + competency cell descriptions (Revolut-style role surface).

ALTER TABLE platform.roles
  ADD COLUMN IF NOT EXISTS mission TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS locations TEXT NOT NULL DEFAULT 'All';

COMMENT ON COLUMN platform.roles.mission IS
  'Short summary of the goals and scope of the role.';
COMMENT ON COLUMN platform.roles.goals IS
  'JSON array of role goal strings.';
COMMENT ON COLUMN platform.roles.locations IS
  'Where the role applies (e.g. All, or a location list).';

ALTER TABLE platform.role_skill_expectations
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN platform.role_skill_expectations.description IS
  'Expectation write-up for this skill at this job grade.';
