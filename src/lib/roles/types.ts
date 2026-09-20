import {
  SKILL_MASTERY_LEVELS,
  type SkillMasteryLevel,
} from '@/lib/skills/types'

/** Expected bar on the role matrix — same bands as skill mastery. */
export const EXPECTED_SKILL_LEVELS = SKILL_MASTERY_LEVELS

export type ExpectedSkillLevel = SkillMasteryLevel

export type RoleSkillExpectationMap = Record<string, ExpectedSkillLevel>

/**
 * @deprecated Mastery write-ups live on the skill (`Skill.mastery`).
 * Kept optional for API backward compatibility; matrix UI ignores this.
 */
export type RoleSkillDescriptionMap = Record<string, string>

export type RoleSkill = {
  skillId: string
  skillName: string
  weightPct: number
  expectations: RoleSkillExpectationMap
  /** @deprecated Prefer `Skill.mastery`. */
  descriptions: RoleSkillDescriptionMap
}

export type PlatformRole = {
  id: string
  name: string
  departmentId: number | null
  departmentName: string
  description: string
  archivedAt: string | null
  headcount: number
  skills: RoleSkill[]
  createdAt: string
  updatedAt: string
}

export type CreateRoleInput = {
  name: string
  departmentId?: number | null
  description?: string
}

export type UpdateRoleInput = {
  name?: string
  departmentId?: number | null
  description?: string
  archivedAt?: string | null
}

export type RoleMatrixSkillInput = {
  skillId: string
  skillName?: string
  weightPct?: number
  expectations?: RoleSkillExpectationMap
  descriptions?: RoleSkillDescriptionMap
}

export type RoleTabId = 'preview' | 'matrix' | 'talent'
