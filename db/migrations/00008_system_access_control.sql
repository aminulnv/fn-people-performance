-- Scalable system access: profiles contain permission rows; employees receive profiles.
-- Initial role name is "admin" with read-only and read+write variations.

CREATE TABLE IF NOT EXISTS platform.access_profiles (
  profile_key TEXT PRIMARY KEY,
  role_name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.access_profile_permissions (
  profile_key TEXT NOT NULL
    REFERENCES platform.access_profiles (profile_key) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  PRIMARY KEY (profile_key, permission_key)
);

CREATE TABLE IF NOT EXISTS platform.employee_access_profiles (
  employee_id INTEGER PRIMARY KEY
    REFERENCES platform.employees (employee_id) ON DELETE CASCADE,
  profile_key TEXT NOT NULL
    REFERENCES platform.access_profiles (profile_key),
  assigned_by_employee_id INTEGER NULL
    REFERENCES platform.employees (employee_id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform.access_profiles (
  profile_key,
  role_name,
  label,
  description
) VALUES
  (
    'admin_read',
    'admin',
    'All read access',
    'Can view all platform data and access assignments.'
  ),
  (
    'admin_write',
    'admin',
    'All read + write access',
    'Can view and manage all platform data, including access assignments.'
  )
ON CONFLICT (profile_key) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO platform.access_profile_permissions (profile_key, permission_key)
VALUES
  ('admin_read', 'platform.read_all'),
  ('admin_write', 'platform.read_all'),
  ('admin_write', 'platform.write_all'),
  ('admin_write', 'access.manage')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS employee_access_profiles_profile_key_idx
  ON platform.employee_access_profiles (profile_key);
