export type BuiltInSystemPermission =
  | 'platform.read_all'
  | 'platform.write_all'
  | 'access.manage'

/** Permission keys are data-driven; built-ins stay documented and autocomplete. */
export type SystemPermission =
  | BuiltInSystemPermission
  | (string & Record<never, never>)

/** Stored key, intentionally open-ended so new profiles need no type rewrite. */
export type AccessProfileKey = string

export type AccessProfile = {
  key: AccessProfileKey
  roleName: string
  label: string
  description: string
  permissions: SystemPermission[]
}

export type EmployeeAccessAssignment = {
  employeeId: number
  profileKey: AccessProfileKey
  assignedAt: string
  assignedByEmployeeId?: number
}

export type AccessControlSnapshot = {
  profiles: AccessProfile[]
  assignments: EmployeeAccessAssignment[]
}

export const ACCESS_PROFILES: AccessProfile[] = [
  {
    key: 'admin_read',
    roleName: 'admin',
    label: 'All read access',
    description: 'Can view all people, goals, reviews, and access assignments.',
    permissions: ['platform.read_all'],
  },
  {
    key: 'admin_write',
    roleName: 'admin',
    label: 'All read + write access',
    description:
      'Can view and manage all platform data, including access assignments.',
    permissions: [
      'platform.read_all',
      'platform.write_all',
      'access.manage',
    ],
  },
]

/** First read+write admins until a persistent assignment exists. */
export const BOOTSTRAP_ADMIN_EMAILS = [
  'aminul.islam@nextventures.io',
] as const

export const BOOTSTRAP_ADMIN_PERMISSIONS: SystemPermission[] = [
  'platform.read_all',
  'platform.write_all',
  'access.manage',
]

export function permissionsForEmail(
  email: string | undefined,
  permissions: readonly SystemPermission[] | undefined,
): SystemPermission[] {
  if (Array.isArray(permissions) && permissions.length > 0) {
    return [...permissions]
  }
  const normalized = (email ?? '').trim().toLowerCase()
  if (
    normalized &&
    BOOTSTRAP_ADMIN_EMAILS.some((candidate) => candidate === normalized)
  ) {
    return [...BOOTSTRAP_ADMIN_PERMISSIONS]
  }
  return Array.isArray(permissions) ? [...permissions] : []
}

export function hasSystemPermission(
  permissions: readonly SystemPermission[] | undefined,
  permission: SystemPermission,
): boolean {
  return permissions?.includes(permission) ?? false
}
