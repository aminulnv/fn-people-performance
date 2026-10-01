import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getSkillsSnapshot, resetSkillsStoreForTests } from '@/lib/skills/store'
import { resetRolesStoreForTests } from '@/lib/roles/store'
import { SkillsLibrary } from './SkillsLibrary'

const authState = vi.hoisted(() => ({
  permissions: ['platform.write_all'] as string[],
}))

vi.mock('@/lib/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { permissions: authState.permissions },
    session: null,
    signInWithGoogle: async () => { },
    signInWithEmailPassword: async () => { },
    signOut: async () => { },
  }),
}))

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  resetSkillsStoreForTests()
  resetRolesStoreForTests()
})

beforeEach(() => {
  authState.permissions = ['platform.write_all']
  resetSkillsStoreForTests()
  resetRolesStoreForTests()
})

function renderSkills(path = '/organisation/skills') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organisation/skills/*" element={<SkillsLibrary />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SkillsLibrary', () => {
  it('lists seeded skills without a department column', () => {
    renderSkills()

    expect(screen.getByRole('columnheader', { name: /^Skill/ })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^Department/ })).not.toBeInTheDocument()
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
    renderSkills('/organisation/skills/skill-ai-fluency')
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
    renderSkills('/organisation/skills/new')
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
    renderSkills('/organisation/skills/skill-account-planning/edit')
    expect(screen.getByRole('dialog', { name: 'Edit skill' })).toBeInTheDocument()
    expect(screen.getByLabelText('Skill name')).toHaveValue('Account Planning')
    expect(screen.getByRole('group', { name: 'Skill sections' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Role$/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Department')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Skill name'), {
      target: { value: 'Account Planning Plus' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(
      getSkillsSnapshot().find((skill) => skill.id === 'skill-account-planning')
        ?.name,
    ).toBe('Account Planning Plus')
  })

  it('hides skill editing when the user cannot write', () => {
    authState.permissions = []
    renderSkills()
    expect(
      screen.queryByRole('link', { name: 'Create New Skill' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Account Planning'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
