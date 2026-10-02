import { bandForScore } from '@/lib/reviews/rollup'
import type { GradeBandId } from '@/lib/reviews/types'
import {
  emptySkillMastery,
  SKILL_GRADE_LEVELS,
  type Skill,
  type SkillGradeLevel,
} from './types'

export const SKILL_SCORE_PREFIX = 'skill:'

export { SKILL_GRADE_LEVELS }
export type { SkillGradeLevel }

const SKILL_GRADE_LABELS: Record<SkillGradeLevel, string> = {
  unsatisfactory: 'Unsatisfactory',
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
}

/** Unsatisfactory=1 … Expert=5 — same weight scale as performance bands for rollup. */
const SKILL_GRADE_RANK: Record<SkillGradeLevel, number> = {
  unsatisfactory: 1,
  basic: 2,
  intermediate: 3,
  advanced: 4,
  expert: 5,
}

/** Legacy stored values → mastery levels. */
const LEGACY_TO_SKILL: Record<string, SkillGradeLevel> = {
  poor: 'unsatisfactory',
  developing: 'basic',
  performing: 'intermediate',
  exceeding: 'advanced',
  exceptional: 'expert',
}

export const SKILL_GRADE_LISTBOX_OPTIONS = SKILL_GRADE_LEVELS.map((id) => ({
  value: id,
  label: SKILL_GRADE_LABELS[id],
  className: `pd-reviews-scorecard__grade-tone--${id}`,
}))

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

export function isSkillGradeLevel(value: unknown): value is SkillGradeLevel {
  return (
    typeof value === 'string' &&
    (SKILL_GRADE_LEVELS as readonly string[]).includes(value)
  )
}

/** Normalize stored skill grades (incl. legacy keys and performance bands). */
export function normalizeSkillGrade(
  value: string | null | undefined,
): SkillGradeLevel | '' {
  if (!value) return ''
  if (isSkillGradeLevel(value)) return value
  return LEGACY_TO_SKILL[value] ?? ''
}

export function skillGradeLabel(grade: string | null | undefined): string {
  const normalized = normalizeSkillGrade(grade)
  if (!normalized) return grade?.trim() || ''
  return SKILL_GRADE_LABELS[normalized]
}

export function skillGradeRank(grade: string | null | undefined): number | null {
  const normalized = normalizeSkillGrade(grade)
  if (!normalized) return null
  return SKILL_GRADE_RANK[normalized]
}

/**
 * Midpoint of graded skill levels, mapped onto the performance band scale
 * (Unsatisfactory=1 … Expert=5 → Exceptional) for the Skills pillar.
 */
export function averageSkillGrade(
  grades: Array<string | '' | null | undefined>,
): GradeBandId | null {
  const ranks = grades
    .map((grade) => skillGradeRank(grade))
    .filter((value): value is number => value != null)
  if (ranks.length === 0) return null
  const mean = ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length
  return bandForScore(mean)
}

export function hasStoredSkillGrades(
  grades: Record<string, string | '' | null | undefined>,
): boolean {
  return Object.values(grades).some((grade) => Boolean(normalizeSkillGrade(grade)))
}

/** Skills that have a saved grade — for the Off / prior-only read view. */
export function skillsWithStoredGrades(
  grades: Record<string, string | '' | null | undefined>,
  catalog: readonly Skill[],
): Skill[] {
  const byId = new Map(catalog.map((skill) => [skill.id, skill]))
  return Object.entries(grades)
    .filter(([, grade]) => Boolean(normalizeSkillGrade(grade)))
    .map(([skillId]) => {
      const known = byId.get(skillId)
      if (known) return known
      return {
        id: skillId,
        name: 'Previously graded skill',
        role: '',
        status: 'active' as const,
        mastery: emptySkillMastery(),
      }
    })
}
