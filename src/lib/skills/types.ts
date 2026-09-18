export type SkillStatus = 'approved' | 'draft'

/** Revolut-style skill mastery bands (Poor → Expert). */
export const SKILL_MASTERY_LEVELS = [
  'none',
  'basic',
  'intermediate',
  'advanced',
  'expert',
] as const

export type SkillMasteryLevel = (typeof SKILL_MASTERY_LEVELS)[number]

/** What each mastery level means for this skill. */
export type SkillMastery = Record<SkillMasteryLevel, string>

export function emptySkillMastery(): SkillMastery {
  return {
    none: '',
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
  /** Department the skill is most used in. Empty = company-wide. */
  department: string
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
