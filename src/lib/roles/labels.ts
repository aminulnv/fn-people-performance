import type { ExpectedSkillLevel, PlatformRole, RoleSkill } from './types'
import { EXPECTED_SKILL_LEVELS } from './types'

const LEVEL_LABELS: Record<ExpectedSkillLevel, string> = {
  none: 'Poor',
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
}

const LEVEL_RANK: Record<ExpectedSkillLevel, number> = {
  none: 0,
  basic: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
}

export function expectedLevelLabel(level: ExpectedSkillLevel | string): string {
  if ((EXPECTED_SKILL_LEVELS as readonly string[]).includes(level)) {
    return LEVEL_LABELS[level as ExpectedSkillLevel]
  }
  return level
}

export function expectedLevelRank(level: ExpectedSkillLevel | string): number {
  if ((EXPECTED_SKILL_LEVELS as readonly string[]).includes(level)) {
    return LEVEL_RANK[level as ExpectedSkillLevel]
  }
  return 0
}

export function expectedHintForGrade(
  level: ExpectedSkillLevel | undefined,
  jobGrade: string,
): string {
  if (!level || level === 'none') return ''
  const grade = jobGrade.trim()
  if (!grade) return `Expected: ${expectedLevelLabel(level)}`
  return `Expected: ${expectedLevelLabel(level)} for ${grade}`
}

export function roleWeightTotal(weights: Array<number | undefined>): number {
  return weights.reduce<number>(
    (sum, value) => sum + (Number(value) || 0),
    0,
  )
}

/** Grades that have at least one non-none expectation on the matrix. */
export function gradesWithExpectations(skills: RoleSkill[]): Set<string> {
  const grades = new Set<string>()
  for (const skill of skills) {
    for (const [grade, level] of Object.entries(skill.expectations)) {
      if (level && level !== 'none') grades.add(grade.trim())
    }
  }
  return grades
}

/**
 * NIPS-style readiness: share of active people whose seniority has expectations
 * defined on the role matrix. Empty matrix or no people → 0.
 */
export function roleNipsPercent(
  role: Pick<PlatformRole, 'skills'>,
  members: Array<{ isActive: boolean; jobGrade: string }>,
): number {
  const active = members.filter((member) => member.isActive)
  if (active.length === 0) return 0
  const covered = gradesWithExpectations(role.skills)
  if (covered.size === 0) return 0
  const matching = active.filter((member) => {
    const grade = member.jobGrade.trim()
    return grade !== '' && covered.has(grade)
  }).length
  return Math.round((matching / active.length) * 100)
}

export function formatNips(percent: number): string {
  return `${percent}%`
}
