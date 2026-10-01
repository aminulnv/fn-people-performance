import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getSkillsSnapshot, resetSkillsStoreForTests } from '@/lib/skills/store'
import { resetRolesStoreForTests } from '@/lib/roles/store'
import { SkillsLibrary } from './SkillsLibrary'
import SkillDetailPage from '@/pages/SkillDetailPage'
import EditSkillPage from '@/pages/EditSkillPage'

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
        <Route path="/organisation/skills/new" element={<SkillsLibrary />} />
        <Route path="/organisation/skills" element={<SkillsLibrary />} />
        <Route
          path="/organisation/skills/:skillId/edit"
          element={<EditSkillPage />}
        />
        <Route
          path="/organisation/skills/:skillId"
          element={<SkillDetailPage />}
        />
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

  it('opens skill detail with roles matrix from a table row', async () => {
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
      await screen.findByRole('heading', { name: 'AI Fluency' }),
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

  it('opens skill detail from a direct link', async () => {
    renderSkills('/organisation/skills/skill-ai-fluency')
    expect(
      await screen.findByRole('heading', { name: 'AI Fluency' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Skill sections' })).toBeInTheDocument()
  })

  it('opens edit page from the skill detail', async () => {
    renderSkills('/organisation/skills/skill-account-planning')
    expect(
      await screen.findByRole('heading', { name: 'Account Planning' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('link', { name: /^Edit$/ })[0]!)
    expect(
      await screen.findByLabelText('Skill name'),
    ).toHaveValue('Account Planning')
  })

  it('creates a skill in the right panel then opens detail', async () => {
    renderSkills('/organisation/skills/new')
    expect(
      screen.getByRole('dialog', { name: 'Create New Skill' }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Skill name'), {
      target: { value: 'Facilitation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create skill' }))
    expect(
      await screen.findByRole('heading', { name: 'Facilitation' }),
    ).toBeInTheDocument()
  })

  it('edits a skill on the dedicated edit page', async () => {
    renderSkills('/organisation/skills/skill-account-planning/edit')
    expect(screen.getByLabelText('Skill name')).toHaveValue('Account Planning')
    expect(screen.queryByLabelText(/^Role$/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Department')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Skill name'), {
      target: { value: 'Account Planning Plus' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Account Planning Plus' }),
      ).toBeInTheDocument()
    })
    expect(
      getSkillsSnapshot().find((skill) => skill.id === 'skill-account-planning')
        ?.name,
    ).toBe('Account Planning Plus')
  })

  it('lets viewers open skill detail without edit controls', async () => {
    authState.permissions = []
    renderSkills()
    expect(
      screen.queryByRole('link', { name: 'Create New Skill' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Account Planning'))
    expect(
      await screen.findByRole('heading', { name: 'Account Planning' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Edit$/ })).not.toBeInTheDocument()
  })
})
