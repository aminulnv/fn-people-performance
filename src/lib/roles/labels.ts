import type { ExpectedSkillLevel } from './types'
import { EXPECTED_SKILL_LEVELS } from './types'

const LEVEL_LABELS: Record<ExpectedSkillLevel, string> = {
  none: 'Not Applicable',
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
