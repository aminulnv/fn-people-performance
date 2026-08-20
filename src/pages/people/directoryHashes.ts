import { normalizeUrlHash } from '@/lib/routing/urlHash'

export type DirectoryScope = 'all' | 'reports' | 'department'

export const PEOPLE_EVERYONE_HASH = 'everyone'
export const PEOPLE_MY_REPORTS_HASH = 'my-reports'
export const PEOPLE_MY_DEPARTMENT_HASH = 'my-department'

export function peopleScopeFromHash(hash: string): DirectoryScope | null {
  const normalized = normalizeUrlHash(hash)
  if (normalized === PEOPLE_EVERYONE_HASH) return 'all'
  if (normalized === PEOPLE_MY_REPORTS_HASH) return 'reports'
  if (normalized === PEOPLE_MY_DEPARTMENT_HASH) return 'department'
  return null
}

export function hashForPeopleScope(scope: DirectoryScope): string {
  switch (scope) {
    case 'all':
      return PEOPLE_EVERYONE_HASH
    case 'reports':
      return PEOPLE_MY_REPORTS_HASH
    case 'department':
      return PEOPLE_MY_DEPARTMENT_HASH
  }
}
