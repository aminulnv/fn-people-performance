import type { CycleSectionId } from './types'

export function reviewsTabPath(tab: 'scorecards' | 'cycles'): string {
  return `/reviews/${tab}`
}

export function cycleDetailPath(
  cycleId: string,
  section: CycleSectionId = 'settings',
): string {
  return `/reviews/cycles/${encodeURIComponent(cycleId)}/${section}`
}
