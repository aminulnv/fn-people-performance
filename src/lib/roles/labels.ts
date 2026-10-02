import type { ExpectedSkillLevel } from './types'
import { EXPECTED_SKILL_LEVELS } from './types'

const LEVEL_LABELS: Record<ExpectedSkillLevel, string> = {
  none: 'Not Applicable',
  unsatisfactory: 'Unsatisfactory',
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
}

/** Weights match scorecard skill grades: Unsatisfactory=1 … Expert=5. */
const LEVEL_RANK: Record<ExpectedSkillLevel, number> = {
  none: 0,
  unsatisfactory: 1,
  basic: 2,
  intermediate: 3,
  advanced: 4,
  expert: 5,
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
