import { normalizeUrlHash } from '@/lib/routing/urlHash'
import type { AnalyticsScope } from './dashboard'

export const ANALYTICS_EVERYONE_HASH = 'everyone'
export const ANALYTICS_MY_REPORTS_HASH = 'my-reports'
export const ANALYTICS_MY_DEPARTMENT_HASH = 'my-department'
export const ANALYTICS_ME_HASH = 'me'

export function analyticsScopeFromHash(hash: string): AnalyticsScope | null {
  const normalized = normalizeUrlHash(hash)
  if (normalized === ANALYTICS_EVERYONE_HASH) return 'all'
  if (normalized === ANALYTICS_MY_REPORTS_HASH) return 'reports'
  if (normalized === ANALYTICS_MY_DEPARTMENT_HASH) return 'department'
  if (normalized === ANALYTICS_ME_HASH) return 'mine'
  return null
}

export function hashForAnalyticsScope(scope: AnalyticsScope): string {
  switch (scope) {
    case 'all':
      return ANALYTICS_EVERYONE_HASH
    case 'reports':
      return ANALYTICS_MY_REPORTS_HASH
    case 'department':
      return ANALYTICS_MY_DEPARTMENT_HASH
    case 'mine':
      return ANALYTICS_ME_HASH
  }
}
