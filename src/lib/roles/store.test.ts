import { afterEach, describe, expect, it } from 'vitest'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import { getSkillsForEmployee, getSkillsSnapshot, resetSkillsStoreForTests } from '@/lib/skills/store'
import {
  backfillRolesFromEmployees,
  createRole,
  resetRolesStoreForTests,
  updateRoleMatrix,
} from './store'
import { listRolesWithHeadcount, rolesForSkill, formatRoleUsageLabel } from './inheritedSkills'

afterEach(() => {
  resetRolesStoreForTests()
  resetSkillsStoreForTests()
  clearEmployees()
})

describe('roles catalog', () => {
  it('backfills catalog rows from existing employee.role strings', async () => {
    const created = await createEmployee({
      employeeId: 21,
      fullName: 'Pat Tester',
      email: 'pat@example.com',
      startDate: '2024-01-01',
      role: 'QA Engineer',
      jobTitle: 'QA Engineer',
      department: 'Engineering',
      team: '',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: 'IC2',
      site: '',
      managerEmail: '',
    })
    expect(created.ok).toBe(true)

    const roles = backfillRolesFromEmployees()
    expect(roles.some((role) => role.name === 'QA Engineer')).toBe(true)
    const qa = roles.find((role) => role.name === 'QA Engineer')
    expect(qa).toBeTruthy()
    const { getEmployee } = await import('@/lib/employees/store')
    expect(getEmployee(21)?.roleId).toBe(qa?.id)
  })

  it('inherits matrix skills for the employee job grade', async () => {
    const role = await createRole({ name: 'QA Engineer' })
    const skill = getSkillsSnapshot()[0]!
    await updateRoleMatrix(role.id, [
      {
        skillId: skill.id,
        skillName: skill.name,
        weightPct: 100,
        expectations: { IC2: 'expert', IC1: 'basic' },
        descriptions: {
          IC2: 'Leads quality strategy for the squad.',
          IC1: 'Familiar with basic test cases.',
        },
      },
    ])
    const created = await createEmployee({
      employeeId: 22,
      fullName: 'Alex QA',
      email: 'alex.qa@example.com',
      startDate: '2024-01-01',
      role: 'QA Engineer',
      roleId: role.id,
      jobTitle: 'QA Engineer',
      department: 'Engineering',
      team: '',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: 'IC2',
      site: '',
      managerEmail: '',
    })
    expect(created.ok).toBe(true)

    const skills = getSkillsForEmployee(22)
    expect(skills.map((item) => item.id)).toContain(skill.id)
    expect(skills.find((item) => item.id === skill.id)?.source).toBe('role')
    expect(skills.find((item) => item.id === skill.id)?.expectedHint).toBe(
      'Expected: Expert for IC2',
    )
  })

  it('counts active people on a role for the org table', async () => {
    const role = await createRole({ name: 'QA Engineer' })
    await createEmployee({
      employeeId: 23,
      fullName: 'Active QA',
      email: 'active.qa@example.com',
      startDate: '2024-01-01',
      role: role.name,
      roleId: role.id,
      jobTitle: 'QA Engineer',
      department: 'Engineering',
      team: '',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: 'IC2',
      site: '',
      managerEmail: '',
    })
    await createEmployee({
      employeeId: 24,
      fullName: 'Inactive QA',
      email: 'inactive.qa@example.com',
      startDate: '2024-01-01',
      role: role.name,
      roleId: role.id,
      jobTitle: 'QA Engineer',
      department: 'Engineering',
      team: '',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: 'IC2',
      site: '',
      managerEmail: '',
      isActive: false,
    })

    const row = listRolesWithHeadcount().find((item) => item.id === role.id)
    expect(row?.headcount).toBe(1)
  })

  it('duplicates a role including its matrix', async () => {
    const { duplicateRole } = await import('./store')
    const role = await createRole({
      name: 'QA Engineer',
      description: 'Ship quality',
    })
    const skill = getSkillsSnapshot()[0]!
    await updateRoleMatrix(role.id, [
      {
        skillId: skill.id,
        skillName: skill.name,
        weightPct: 40,
        expectations: { IC2: 'advanced' },
        descriptions: { IC2: 'Owns release quality.' },
      },
    ])
    const copy = await duplicateRole(role.id)
    expect(copy.id).not.toBe(role.id)
    expect(copy.name).toContain('(copy)')
    expect(copy.description).toBe('Ship quality')
    expect(copy.skills).toHaveLength(1)
    expect(copy.skills[0]?.expectations.IC2).toBe('advanced')
    expect(copy.skills[0]?.descriptions.IC2).toBe('Owns release quality.')
  })

  it('lists roles that use a skill from the matrix', async () => {
    const skill = getSkillsSnapshot()[0]!
    expect(rolesForSkill(skill.id)).toEqual([])

    const design = await createRole({ name: 'Design Manager' })
    const product = await createRole({ name: 'Product Manager' })
    await updateRoleMatrix(design.id, [
      {
        skillId: skill.id,
        skillName: skill.name,
        weightPct: 50,
        expectations: { IC2: 'basic' },
      },
    ])
    await updateRoleMatrix(product.id, [
      { skillId: skill.id, skillName: skill.name, weightPct: 40 },
    ])

    const usage = rolesForSkill(skill.id)
    expect(usage.map((role) => role.name)).toEqual([
      'Design Manager',
      'Product Manager',
    ])
    expect(formatRoleUsageLabel(usage)).toBe(
      'Design Manager, Product Manager',
    )
    expect(formatRoleUsageLabel(usage, 1)).toBe('Design Manager +1')

    const { skillRoleMatrixRows } = await import('./inheritedSkills')
    const matrix = skillRoleMatrixRows(skill.id)
    expect(matrix).toHaveLength(2)
    expect(matrix[0]?.expectations.IC2).toBe('basic')
    expect(matrix[0]?.departmentName).toBeDefined()
  })
})
