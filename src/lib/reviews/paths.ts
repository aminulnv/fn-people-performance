import type { CycleSectionId } from './types'

export type ReviewsTabId = 'scorecards' | 'skills' | 'values'

const REVIEWS_TAB_ROOTS = new Set([
  '/reviews/scorecards',
  '/reviews/skills',
  '/reviews/values',
])

export function reviewsTabPath(tab: ReviewsTabId = 'scorecards'): string {
  return `/reviews/${tab}`
}

/** True on the Reviews tab list roots only — not scorecard/value detail subpages. */
export function isReviewsTabRoot(pathname: string): boolean {
  return REVIEWS_TAB_ROOTS.has(pathname)
}

export function valuesLibraryPath(): string {
  return '/reviews/values'
}

export function valueCreatePath(): string {
  return '/reviews/values/new'
}

export function valueDetailPath(valueId: string): string {
  return `/reviews/values/${encodeURIComponent(valueId)}/edit`
}

export function valueEditPath(valueId: string): string {
  return `/reviews/values/${encodeURIComponent(valueId)}/edit`
}

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

export function scorecardsBuilderPath(formId?: string): string {
  if (!formId) return '/scorecards-builder'
  return `/scorecards-builder/${encodeURIComponent(formId)}`
}
