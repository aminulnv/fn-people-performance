import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { PlatformDepartment } from '@/lib/employees/types'
import { getSkillsSnapshot, resetSkillsStoreForTests } from '@/lib/skills/store'
import { resetRolesStoreForTests } from '@/lib/roles/store'
import { SkillsLibrary } from './SkillsLibrary'

const catalogDepartments: PlatformDepartment[] = [
  {
    id: 1,
    name: 'Sales',
    headEmployeeId: null,
    headName: null,
    headEmail: null,
    hrbpEmployeeId: null,
    hrbpName: null,
    hrbpEmail: null,
    headcount: 0,
    teamCount: 0,
  },
  {
    id: 2,
    name: 'Finance',
    headEmployeeId: null,
    headName: null,
    headEmail: null,
    hrbpEmployeeId: null,
    hrbpName: null,
    hrbpEmail: null,
    headcount: 0,
    teamCount: 0,
  },
  {
    id: 3,
    name: 'Engineering',
    headEmployeeId: null,
    headName: null,
    headEmail: null,
    hrbpEmployeeId: null,
    hrbpName: null,
    hrbpEmail: null,
    headcount: 0,
    teamCount: 0,
  },
]

vi.mock('@/lib/employees/useEmployees', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/employees/useEmployees')>()
  return {
    ...actual,
    useOrganisationCatalogs: () => ({
      departments: catalogDepartments,
      teams: [],
      ready: true,
    }),
  }
})

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  resetSkillsStoreForTests()
  resetRolesStoreForTests()
})

beforeEach(() => {
  resetSkillsStoreForTests()
  resetRolesStoreForTests()
})

function renderSkills(path = '/reviews/skills') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reviews/skills/*" element={<SkillsLibrary />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SkillsLibrary', () => {
  it('lists seeded skills without an owner column', () => {
    renderSkills()

    expect(screen.getByRole('columnheader', { name: /^Skill/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Department/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Used by/ })).toBeInTheDocument()
    expect(screen.queryByText('Owner')).not.toBeInTheDocument()
    expect(screen.getByText('AI Fluency')).toBeInTheDocument()
    expect(screen.getByText('Account Planning')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Create New Skill/ }),
    ).toBeInTheDocument()
  })

  it('shows roles that attach a skill on the matrix', async () => {
    const { createRole, updateRoleMatrix } = await import('@/lib/roles/store')
    const skill = getSkillsSnapshot().find((row) => row.name === 'AI Fluency')!
    const role = await createRole({ name: 'Design Manager' })
    await updateRoleMatrix(role.id, [
      {
        skillId: skill.id,
        skillName: skill.name,
        weightPct: 50,
        expectations: { IC2: 'intermediate', M1: 'expert' },
      },
    ])

    renderSkills()
    expect(await screen.findByText('Design Manager')).toBeInTheDocument()

    fireEvent.click(screen.getByText('AI Fluency'))
    expect(
      await screen.findByRole('dialog', { name: 'Edit skill' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Roles/ }))
    expect(
      await screen.findByRole('columnheader', { name: /^Role$/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Function' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Headcount' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'IC2' })).toBeInTheDocument()
    expect(screen.getByText('Intermediate')).toBeInTheDocument()
    expect(screen.getByText('Expert')).toBeInTheDocument()
  })

  it('opens edit from a skill direct link', async () => {
    renderSkills('/reviews/skills/skill-ai-fluency')
    expect(
      await screen.findByRole('dialog', { name: 'Edit skill' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Skill name')).toHaveValue('AI Fluency')
  })

  it('opens edit from a table row click', async () => {
    renderSkills()
    fireEvent.click(screen.getByText('Account Planning'))
    expect(
      await screen.findByRole('dialog', { name: 'Edit skill' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Skill name')).toHaveValue('Account Planning')
  })

  it('creates a skill in the right panel', async () => {
    renderSkills('/reviews/skills/new')
    expect(
      screen.getByRole('dialog', { name: 'Create New Skill' }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Skill name'), {
      target: { value: 'Facilitation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create skill' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Facilitation')).toBeInTheDocument()
  })

  it('edits a skill in the right panel', async () => {
    renderSkills('/reviews/skills/skill-account-planning/edit')
    expect(screen.getByRole('dialog', { name: 'Edit skill' })).toBeInTheDocument()
    expect(screen.getByLabelText('Skill name')).toHaveValue('Account Planning')
    expect(screen.getByRole('group', { name: 'Skill sections' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Role$/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Department' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Engineering' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(
      getSkillsSnapshot().find((skill) => skill.id === 'skill-account-planning')
        ?.department,
    ).toBe('Engineering')
  })

  it('rejects free-text departments that are not in the catalog', async () => {
    renderSkills('/reviews/skills/new')
    fireEvent.change(screen.getByLabelText('Skill name'), {
      target: { value: 'Negotiation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Department' }))
    expect(
      screen.queryByRole('option', { name: 'Enterprise Sales' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sales' })).toBeInTheDocument()
  })
})
