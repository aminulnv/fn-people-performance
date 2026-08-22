import type { CycleSectionId } from './types'

export function reviewsTabPath(tab: 'scorecards' = 'scorecards'): string {
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
  return section ? `${path}#${encodeURIComponent(section)}` : path
}
