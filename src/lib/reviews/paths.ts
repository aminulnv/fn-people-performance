import type { CycleSectionId } from './types'

export type ReviewsTabId = 'scorecards' | 'skills'

export function reviewsTabPath(tab: ReviewsTabId = 'scorecards'): string {
  return `/reviews/${tab}`
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
