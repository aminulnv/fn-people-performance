import type { CycleSectionId } from './types'

export type ReviewsTabId = 'scorecards' | 'scorecards-library'

const REVIEWS_TAB_ROOTS = new Set([
  '/reviews/scorecards',
  '/reviews/scorecards-library',
])

export function reviewsTabPath(tab: ReviewsTabId = 'scorecards'): string {
  return `/reviews/${tab}`
}

/** True on the Reviews tab list roots only — not scorecard detail subpages. */
export function isReviewsTabRoot(pathname: string): boolean {
  return REVIEWS_TAB_ROOTS.has(pathname)
}

export {
  skillCreatePath,
  skillEditPath,
  skillsLibraryPath,
  valueCreatePath,
  valueDetailPath,
  valueEditPath,
  valuesLibraryPath,
} from '@/lib/organisation/paths'

export function cyclesListPath(): string {
  return '/cycles'
}

export function cycleDetailPath(
  cycleId: string,
  section: CycleSectionId = 'settings',
): string {
  return `/cycles/${encodeURIComponent(cycleId)}/${section}`
}

export function cycleGroupPath(
  cycleId: string,
  groupId: string,
  section?: string,
): string {
  const path = `/cycles/${encodeURIComponent(cycleId)}/groups/${encodeURIComponent(groupId)}`
  return section ? `${path}#${section.startsWith('#') ? section.slice(1) : section}` : path
}

export function scorecardsLibraryPath(formId?: string): string {
  if (!formId) return '/reviews/scorecards-library'
  return `/reviews/scorecards-library/${encodeURIComponent(formId)}`
}

/** @deprecated Prefer scorecardsLibraryPath — kept as an alias for call sites. */
export function scorecardsBuilderPath(formId?: string): string {
  return scorecardsLibraryPath(formId)
}
