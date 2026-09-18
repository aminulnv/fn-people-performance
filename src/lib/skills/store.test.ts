import { describe, expect, it } from 'vitest'
import { SEED_SKILLS } from './seed'
import {
  assignSkillToEmployee,
  createSkill,
  getSkillIdsForEmployee,
  getSkillsForEmployee,
  getSkillsSnapshot,
  removeSkillFromEmployee,
  resetSkillsStoreForTests,
  talentCountForSkill,
  updateSkill,
} from './store'

describe('skills store', () => {
  it('seeds skills with no talent until people are assigned', async () => {
    resetSkillsStoreForTests()
    const skills = getSkillsSnapshot()
    expect(skills.length).toBe(SEED_SKILLS.length)
    expect(skills.some((skill) => skill.name === 'AI Fluency')).toBe(true)
    expect(talentCountForSkill(skills[0]!.id)).toBe(0)
  })

  it('persists library skills in localStorage', async () => {
    resetSkillsStoreForTests()
    const created = await createSkill({
      name: 'Facilitation',
      department: 'HR',
      role: 'Manager',
    })
    expect(created.name).toBe('Facilitation')
    expect(created.department).toBe('HR')
    expect(created.status).toBe('approved')
    expect(getSkillsSnapshot().some((skill) => skill.id === created.id)).toBe(
      true,
    )
    const raw = localStorage.getItem('pd-skills-library-v2')
    expect(raw).toContain('Facilitation')
  })

  it('requires a name', async () => {
    resetSkillsStoreForTests()
    await expect(createSkill({ name: '   ' })).rejects.toThrow(
      'Give the skill a name.',
    )
  })

  it('updates an existing skill', async () => {
    resetSkillsStoreForTests()
    const created = await createSkill({
      name: 'Facilitation',
      department: 'HR',
    })
    const updated = await updateSkill(created.id, {
      name: 'Workshop Facilitation',
      department: 'People',
      role: 'Manager',
      status: 'draft',
    })
    expect(updated.name).toBe('Workshop Facilitation')
    expect(updated.department).toBe('People')
    expect(updated.role).toBe('Manager')
    expect(updated.status).toBe('draft')
    expect(
      getSkillsSnapshot().find((skill) => skill.id === created.id)?.name,
    ).toBe('Workshop Facilitation')
  })

  it('assigns and removes skills on a person', async () => {
    resetSkillsStoreForTests()
    const skill = getSkillsSnapshot()[0]!
    await assignSkillToEmployee(1, skill.id)
    expect(getSkillIdsForEmployee(1)).toEqual([skill.id])
    expect(getSkillsForEmployee(1).map((item) => item.id)).toEqual([skill.id])
    expect(talentCountForSkill(skill.id)).toBe(1)

    await removeSkillFromEmployee(1, skill.id)
    expect(getSkillIdsForEmployee(1)).toEqual([])
    expect(talentCountForSkill(skill.id)).toBe(0)
  })

  it('lists inherited role skills plus extras on the scorecard', async () => {
    resetSkillsStoreForTests()
    const { resetRolesStoreForTests, createRole, updateRoleMatrix } =
      await import('@/lib/roles/store')
    const { clearEmployees, createEmployee } = await import(
      '@/lib/employees/store'
    )
    resetRolesStoreForTests()
    clearEmployees()
    const inherited = getSkillsSnapshot()[0]!
    const extra = getSkillsSnapshot()[1]!
    const role = await createRole({ name: 'QA Engineer' })
    await updateRoleMatrix(role.id, [
      {
        skillId: inherited.id,
        skillName: inherited.name,
        weightPct: 50,
        expectations: { IC2: 'advanced' },
      },
    ])
    await createEmployee({
      employeeId: 9,
      fullName: 'Review Subject',
      email: 'review.subject@example.com',
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
    await assignSkillToEmployee(9, extra.id)
    const listed = getSkillsForEmployee(9)
    expect(listed.map((item) => item.id)).toEqual(
      expect.arrayContaining([inherited.id, extra.id]),
    )
    expect(listed.find((item) => item.id === inherited.id)?.source).toBe('role')
    expect(listed.find((item) => item.id === extra.id)?.source).toBe('extra')
    resetRolesStoreForTests()
    clearEmployees()
  })
})
