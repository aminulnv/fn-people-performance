import { GRADE_BAND_ORDER } from '@/lib/reviews/labels'
import type { GradeBandId } from '@/lib/reviews/types'
import { emptySkillMastery, type Skill } from './types'

export const SKILL_SCORE_PREFIX = 'skill:'

export function skillScorePillarId(skillId: string): string {
  return `${SKILL_SCORE_PREFIX}${skillId}`
}

export function isSkillScorePillarId(pillarId: string): boolean {
  return pillarId.startsWith(SKILL_SCORE_PREFIX)
}

export function skillIdFromScorePillarId(pillarId: string): string | null {
  if (!isSkillScorePillarId(pillarId)) return null
  return pillarId.slice(SKILL_SCORE_PREFIX.length) || null
}

/** Midpoint of graded bands — used to roll skill grades into the Skills pillar. */
export function averageSkillGrade(
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

export function hasStoredSkillGrades(
  grades: Record<string, GradeBandId | '' | null | undefined>,
): boolean {
  return Object.values(grades).some((grade) => Boolean(grade))
}

/** Skills that have a saved grade — for the Off / prior-only read view. */
export function skillsWithStoredGrades(
  grades: Record<string, GradeBandId | '' | null | undefined>,
  catalog: readonly Skill[],
): Skill[] {
  const byId = new Map(catalog.map((skill) => [skill.id, skill]))
  return Object.entries(grades)
    .filter(([, grade]) => Boolean(grade))
    .map(([skillId]) => {
      const known = byId.get(skillId)
      if (known) return known
      return {
        id: skillId,
        name: 'Previously graded skill',
        department: '',
        role: '',
        status: 'approved' as const,
        mastery: emptySkillMastery(),
      }
    })
}
