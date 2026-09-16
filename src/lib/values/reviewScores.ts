import { GRADE_BAND_ORDER } from '@/lib/reviews/labels'
import type { GradeBandId } from '@/lib/reviews/types'
import { CORE_VALUES } from './catalog'
import type { CompanyValue } from './types'

export const VALUE_SCORE_PREFIX = 'value:'

export function valueScorePillarId(valueId: string): string {
  return `${VALUE_SCORE_PREFIX}${valueId}`
}

export function isValueScorePillarId(pillarId: string): boolean {
  return pillarId.startsWith(VALUE_SCORE_PREFIX)
}

export function valueIdFromScorePillarId(pillarId: string): string | null {
  if (!isValueScorePillarId(pillarId)) return null
  return pillarId.slice(VALUE_SCORE_PREFIX.length) || null
}

/** Unweighted midpoint of graded values — rolls into the Core Values pillar. */
export function averageValueGrade(
  grades: Array<GradeBandId | '' | null | undefined>,
): GradeBandId | null {
  const ranks = grades
    .map((grade) => {
      if (!grade) return null
      const index = GRADE_BAND_ORDER.indexOf(grade)
      return index >= 0 ? index : null
    })
    .filter((value): value is number => value != null)
  if (ranks.length === 0) return null
  const mean = ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length
  const nearest = Math.round(mean)
  return GRADE_BAND_ORDER[nearest] ?? null
}

export function hasStoredValueGrades(
  grades: Record<string, GradeBandId | '' | null | undefined>,
): boolean {
  return Object.values(grades).some((grade) => Boolean(grade))
}

export function valuesWithStoredGrades(
  grades: Record<string, GradeBandId | '' | null | undefined>,
  catalog: readonly CompanyValue[] = CORE_VALUES,
): CompanyValue[] {
  const byId = new Map(catalog.map((value) => [value.id, value]))
  return Object.entries(grades)
    .filter(([, grade]) => Boolean(grade))
    .map(([valueId]) => {
      const known = byId.get(valueId)
      if (known) return known
      return {
        id: valueId,
        name: 'Previously graded value',
        description: '',
        status: 'enabled',
        playbookUrl: null,
        behaviours: [],
      }
    })
}
