export type SkillStatus = 'approved' | 'draft'

/**
 * Skill mastery bands (Not Applicable → Expert).
 * `none` is Not Applicable on the role matrix; grading uses Poor…Expert.
 */
export const SKILL_MASTERY_LEVELS = [
  'none',
  'poor',
  'basic',
  'intermediate',
  'advanced',
  'expert',
] as const

export type SkillMasteryLevel = (typeof SKILL_MASTERY_LEVELS)[number]

/** Gradable skill levels (excludes Not Applicable). Weights: Poor=1 … Expert=5. */
export const SKILL_GRADE_LEVELS = [
  'poor',
  'basic',
  'intermediate',
  'advanced',
  'expert',
] as const

export type SkillGradeLevel = (typeof SKILL_GRADE_LEVELS)[number]

/** What each mastery level means for this skill. */
export type SkillMastery = Record<SkillMasteryLevel, string>

export function emptySkillMastery(): SkillMastery {
  return {
    none: '',
    poor: '',
    basic: '',
    intermediate: '',
    advanced: '',
    expert: '',
  }
}

/** Catalog skill. People are assigned later; Talent is derived from those assignments. */
export type Skill = {
  id: string
  name: string
  /**
   * Legacy free-text tag. Not used for inheritance or grading — roles that
   * use a skill come from the role competency matrix (`rolesForSkill`).
   */
  role: string
  status: SkillStatus
  /** Rubric text for each mastery level. */
  mastery: SkillMastery
}

export type EmployeeSkillAssignment = {
  employeeId: number
  skillIds: string[]
}
