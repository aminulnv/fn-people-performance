import type { CycleSectionId } from './types'

export const CYCLE_SECTIONS = [
  { id: 'settings', label: 'Cycle Settings' },
] as const satisfies ReadonlyArray<{ id: CycleSectionId; label: string }>

export function isCycleSection(
  value: string | undefined,
): value is CycleSectionId {
  return CYCLE_SECTIONS.some((section) => section.id === value)
}
