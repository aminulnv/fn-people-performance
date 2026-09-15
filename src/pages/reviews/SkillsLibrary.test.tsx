import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { resetSkillsStoreForTests } from '@/lib/skills/store'
import { SkillsLibrary } from './SkillsLibrary'

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

describe('SkillsLibrary', () => {
  it('lists seeded skills without an owner column', () => {
    render(
      <MemoryRouter>
        <SkillsLibrary />
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation', { name: 'Reviews sections' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skills' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Skill/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Function/ })).toBeInTheDocument()
    expect(screen.queryByText('Owner')).not.toBeInTheDocument()
    expect(screen.getByText('AI Fluency')).toBeInTheDocument()
    expect(screen.getByText('Account Planning')).toBeInTheDocument()
  })

  it('creates a skill from the library', () => {
    render(
      <MemoryRouter>
        <SkillsLibrary />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create new skill' }))
    fireEvent.change(screen.getByLabelText('Skill name'), {
      target: { value: 'Facilitation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create skill' }))
    expect(screen.getByText('Facilitation')).toBeInTheDocument()
  })
})
