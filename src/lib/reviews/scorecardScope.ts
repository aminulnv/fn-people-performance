import { normalizeUrlHash } from '@/lib/routing/urlHash'
import type { ScorecardRow } from './scorecards'

export type ScorecardDirectoryScope = 'mine' | 'reports' | 'all'

export const REVIEWS_MY_REVIEWS_HASH = 'my-reviews'
export const REVIEWS_MY_REPORTS_HASH = 'my-reports'
export const REVIEWS_EVERYONE_HASH = 'everyone'

export const SCORECARD_SCOPE_OPTIONS: {
  id: ScorecardDirectoryScope
  label: string
}[] = [
  { id: 'mine', label: 'My Reviews' },
  { id: 'reports', label: 'My Reports' },
  { id: 'all', label: 'Everyone' },
]

export function hashForScorecardScope(scope: ScorecardDirectoryScope): string {
  switch (scope) {
    case 'mine':
      return REVIEWS_MY_REVIEWS_HASH
    case 'reports':
      return REVIEWS_MY_REPORTS_HASH
    case 'all':
      return REVIEWS_EVERYONE_HASH
  }
}

export function scorecardScopeFromHash(
  hash: string,
): ScorecardDirectoryScope | null {
  const normalized = normalizeUrlHash(hash)
  if (normalized === REVIEWS_MY_REVIEWS_HASH) return 'mine'
  if (normalized === REVIEWS_MY_REPORTS_HASH) return 'reports'
  if (normalized === REVIEWS_EVERYONE_HASH) return 'all'
  return null
}

/** Managers land on the queue they write; everyone else lands on their own card. */
export function defaultScorecardScope(
  hasDirectReports: boolean,
): ScorecardDirectoryScope {
  return hasDirectReports ? 'reports' : 'mine'
}

export function visibleScorecardScopes(input: {
  hasViewer: boolean
  hasDirectReports: boolean
}): { id: ScorecardDirectoryScope; label: string }[] {
  if (!input.hasViewer) return [{ id: 'all', label: 'Everyone' }]
  return SCORECARD_SCOPE_OPTIONS.filter((option) => {
    if (option.id === 'reports') return input.hasDirectReports
    return true
  })
}

export function resolveScorecardScope(
  scope: ScorecardDirectoryScope,
  available: readonly { id: ScorecardDirectoryScope }[],
): ScorecardDirectoryScope {
  if (available.some((option) => option.id === scope)) return scope
  return available[0]?.id ?? 'all'
}

export function scorecardMatchesScope(
  row: Pick<ScorecardRow, 'employeeId' | 'isMine'>,
  scope: ScorecardDirectoryScope,
  viewerEmployeeId: number | null,
): boolean {
  if (scope === 'all' || viewerEmployeeId == null) return true
  if (scope === 'mine') return row.employeeId === viewerEmployeeId
  return row.isMine
}
