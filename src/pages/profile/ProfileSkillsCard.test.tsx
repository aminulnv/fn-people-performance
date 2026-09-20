import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import { createRole, resetRolesStoreForTests, updateRoleMatrix } from '@/lib/roles/store'
import {
  getSkillsSnapshot,
  resetSkillsStoreForTests,
} from '@/lib/skills/store'
import { ProfileSkillsCard } from './ProfileSkillsCard'

afterEach(() => {
  cleanup()
  resetSkillsStoreForTests()
  resetRolesStoreForTests()
  clearEmployees()
})

describe('ProfileSkillsCard', () => {
  it('does not offer a way to add skills onto the person', () => {
    render(
      <MemoryRouter>
        <ProfileSkillsCard employeeId={1} />
      </MemoryRouter>,
    )

    expect(screen.getByText('No role assigned')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Assign a role' })).not.toBeInTheDocument()
  })

  it('lets an admin with write access assign a role', () => {
    render(
      <MemoryRouter>
        <ProfileSkillsCard employeeId={1} canEdit />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Assign a role' })).toHaveAttribute(
      'href',
      '/people/1/edit',
    )
  })

  it('shows skills from the assigned role', async () => {
    const role = await createRole({ name: 'QA Engineer' })
    const skill = getSkillsSnapshot()[0]!
    await updateRoleMatrix(role.id, [
      {
        skillId: skill.id,
        skillName: skill.name,
        weightPct: 40,
        expectations: { IC2: 'expert' },
      },
    ])
    const created = await createEmployee({
      employeeId: 7,
      fullName: 'Role Person',
      email: 'role.person@example.com',
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
    expect(created.ok).toBe(true)

    render(
      <MemoryRouter>
        <ProfileSkillsCard employeeId={7} />
      </MemoryRouter>,
    )

    expect(screen.getByText(skill.name)).toBeInTheDocument()
    expect(screen.getByText('Expected: Expert for IC2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `Remove ${skill.name}` })).toBeNull()
  })
})
