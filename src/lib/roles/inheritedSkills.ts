import { listEmployees } from '@/lib/employees/store'
import { JOB_GRADE_OPTIONS } from '@/lib/employees/catalog'
import { emptySkillMastery, type Skill } from '@/lib/skills/types'
import { expectedHintForGrade, roleNipsPercent } from './labels'
import { getRole, listRoles } from './store'
import type {
  ExpectedSkillLevel,
  RoleSkillExpectationMap,
} from './types'

export type PersonSkill = Skill & {
  source: 'role' | 'extra'
  expectedLevel?: ExpectedSkillLevel
  expectedHint?: string
}

export function getInheritedSkillsForEmployee(
  employeeId: number,
  catalog: Skill[],
): PersonSkill[] {
  const employee = listEmployees().find((row) => row.employeeId === employeeId)
  if (!employee?.roleId) return []
  const role = getRole(employee.roleId)
  if (!role) return []
  const byId = new Map(catalog.map((skill) => [skill.id, skill]))
  const grade = employee.jobGrade.trim()
  const inherited: PersonSkill[] = []
  for (const row of role.skills) {
    const skill = byId.get(row.skillId) ?? {
      id: row.skillId,
      name: row.skillName,
      department: '',
      role: '',
      status: 'approved' as const,
      mastery: emptySkillMastery(),
    }
    const expectedLevel = grade ? row.expectations[grade] : undefined
    inherited.push({
      ...skill,
      source: 'role',
      expectedLevel,
      expectedHint: expectedHintForGrade(expectedLevel, grade),
    })
  }
  return inherited.sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
  )
}

export function unionPersonSkills(
  inherited: PersonSkill[],
  extras: Skill[],
): PersonSkill[] {
  const seen = new Set(inherited.map((skill) => skill.id))
  const merged = [...inherited]
  for (const skill of extras) {
    if (seen.has(skill.id)) continue
    seen.add(skill.id)
    merged.push({ ...skill, source: 'extra' })
  }
  return merged
}

export function employeeIdsWithRoleSkill(skillId: string): number[] {
  return listEmployees()
    .filter((employee) => {
      if (!employee.roleId) return false
      const role = getRole(employee.roleId)
      return Boolean(role?.skills.some((row) => row.skillId === skillId))
    })
    .map((employee) => employee.employeeId)
}

export function roleHeadcount(roleId: string): number {
  return listEmployees().filter(
    (employee) => employee.isActive && employee.roleId === roleId,
  ).length
}

export function membersForRole(roleId: string) {
  return listEmployees().filter((employee) => employee.roleId === roleId)
}

export function listRolesWithHeadcount() {
  return listRoles().map((role) => {
    const members = membersForRole(role.id)
    return {
      ...role,
      headcount: members.filter((member) => member.isActive).length,
      nipsPercent: roleNipsPercent(role, members),
    }
  })
}

export type SkillRoleRef = { id: string; name: string }

/** Roles whose competency matrix includes this skill (derived, not stored on Skill). */
export function rolesForSkill(skillId: string): SkillRoleRef[] {
  const id = skillId.trim()
  if (!id) return []
  return listRoles()
    .filter((role) => role.skills.some((row) => row.skillId === id))
    .map((role) => ({ id: role.id, name: role.name }))
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    )
}

/** skillId → roles that attach it, for library tables / filters. */
export function roleUsageBySkillId(): Record<string, SkillRoleRef[]> {
  const map: Record<string, SkillRoleRef[]> = {}
  for (const role of listRoles()) {
    for (const row of role.skills) {
      const list = map[row.skillId] ?? (map[row.skillId] = [])
      if (list.some((item) => item.id === role.id)) continue
      list.push({ id: role.id, name: role.name })
    }
  }
  for (const refs of Object.values(map)) {
    refs.sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    )
  }
  return map
}

export function formatRoleUsageLabel(
  roles: SkillRoleRef[],
  maxNames = 2,
): string {
  if (roles.length === 0) return ''
  if (roles.length <= maxNames) {
    return roles.map((role) => role.name).join(', ')
  }
  const shown = roles.slice(0, maxNames).map((role) => role.name)
  return `${shown.join(', ')} +${roles.length - maxNames}`
}

/** Job grades shown as matrix columns (catalog + any live employee grades). */
export function matrixGrades(): string[] {
  const extras = listEmployees().map((employee) => employee.jobGrade)
  const seen = new Set<string>()
  const grades: string[] = []
  for (const value of [...JOB_GRADE_OPTIONS, ...extras]) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    grades.push(trimmed)
  }
  return grades
}

export type SkillRoleMatrixRow = {
  roleId: string
  roleName: string
  departmentName: string
  headcount: number
  weightPct: number
  expectations: RoleSkillExpectationMap
}

/** Roles that attach this skill, with expectations by job grade (Revolut-style). */
export function skillRoleMatrixRows(skillId: string): SkillRoleMatrixRow[] {
  const id = skillId.trim()
  if (!id) return []
  const rows: SkillRoleMatrixRow[] = []
  for (const role of listRoles()) {
    if (role.archivedAt) continue
    const attached = role.skills.find((row) => row.skillId === id)
    if (!attached) continue
    rows.push({
      roleId: role.id,
      roleName: role.name,
      departmentName: role.departmentName.trim(),
      headcount: roleHeadcount(role.id),
      weightPct: attached.weightPct,
      expectations: { ...attached.expectations },
    })
  }
  return rows.sort((left, right) =>
    left.roleName.localeCompare(right.roleName, undefined, {
      sensitivity: 'base',
    }),
  )
}
