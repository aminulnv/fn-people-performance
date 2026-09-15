import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  getSkillIdsForEmployee,
  resetSkillsStoreForTests,
} from '@/lib/skills/store'
import { ProfileSkillsCard } from './ProfileSkillsCard'

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
}

afterEach(() => {
  cleanup()
  resetSkillsStoreForTests()
})

describe('ProfileSkillsCard', () => {
  it('lets the person add a library skill to their profile', () => {
    render(
      <MemoryRouter>
        <ProfileSkillsCard employeeId={1} canEdit />
      </MemoryRouter>,
    )

    expect(screen.getByText('No skills assigned')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add skills' })[0]!)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]!)
    expect(screen.queryByText('No skills assigned')).not.toBeInTheDocument()
    expect(getSkillIdsForEmployee(1).length).toBe(1)
  })

  it('hides add controls when read-only', () => {
    render(
      <MemoryRouter>
        <ProfileSkillsCard employeeId={1} canEdit={false} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Add skills' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open skills library' })).toBeInTheDocument()
  })
})
