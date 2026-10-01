-- Skills are shared across departments; ownership lives on roles, not skills.

ALTER TABLE platform.skills
  DROP COLUMN IF EXISTS function_name;
