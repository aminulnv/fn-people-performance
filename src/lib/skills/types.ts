export type SkillStatus = 'approved' | 'draft'

/** Catalog skill. People are assigned later; Talent is derived from those assignments. */
export type Skill = {
  id: string
  name: string
  /** Function / department the skill is most used in. Empty = company-wide. */
  function: string
  /** Role the skill is typically assessed against. Empty = any role. */
  role: string
  status: SkillStatus
}

export type EmployeeSkillAssignment = {
  employeeId: number
  skillIds: string[]
}
