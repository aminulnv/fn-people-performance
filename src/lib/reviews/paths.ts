import type { CycleSectionId } from './types'

export type ReviewsTabId =
  | 'scorecards'
  | 'scorecards-library'
  | 'skills'
  | 'values'

const REVIEWS_TAB_ROOTS = new Set([
  '/reviews/scorecards',
  '/reviews/scorecards-library',
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

export function skillsLibraryPath(): string {
  return '/reviews/skills'
}

export function skillCreatePath(): string {
  return '/reviews/skills/new'
}

export function skillEditPath(skillId: string): string {
  return `/reviews/skills/${encodeURIComponent(skillId)}/edit`
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

export function scorecardsLibraryPath(formId?: string): string {
  if (!formId) return '/reviews/scorecards-library'
  return `/reviews/scorecards-library/${encodeURIComponent(formId)}`
}

/** @deprecated Prefer scorecardsLibraryPath — kept as an alias for call sites. */
export function scorecardsBuilderPath(formId?: string): string {
  return scorecardsLibraryPath(formId)
}
