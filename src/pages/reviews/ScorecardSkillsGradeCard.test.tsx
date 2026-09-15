import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ScorecardSkillsGradeCard } from './ScorecardSkillsGradeCard'
import type { Skill } from '@/lib/skills/types'

const skill: Skill = {
  id: 'skill-ai-fluency',
  name: 'AI Fluency',
  function: 'Engineering',
  role: '',
  status: 'approved',
}

afterEach(() => cleanup())

describe('ScorecardSkillsGradeCard', () => {
  it('shows an empty state with a profile link', () => {
    render(
      <MemoryRouter>
        <ScorecardSkillsGradeCard
          skills={[]}
          grades={{}}
          profileHref="/people/7"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('No skills on their profile')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveAttribute(
      'href',
      '/people/7',
    )
  })

  it('lets the manager grade each assigned skill', () => {
    const onGradeChange = vi.fn()
    render(
      <MemoryRouter>
        <ScorecardSkillsGradeCard
          skills={[skill]}
          grades={{}}
          editing
          onGradeChange={onGradeChange}
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'AI Fluency grade' }))
    fireEvent.click(screen.getByRole('option', { name: 'Performing' }))
    expect(onGradeChange).toHaveBeenCalledWith('skill-ai-fluency', 'performing')
  })

  it('shows read-only grades on the view scorecard', () => {
    render(
      <MemoryRouter>
        <ScorecardSkillsGradeCard
          skills={[skill]}
          grades={{ 'skill-ai-fluency': 'exceeding' }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Exceeding')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'AI Fluency grade' })).toBeNull()
  })

  it('shows a quiet prior note when Skills is off but grades remain', () => {
    render(
      <MemoryRouter>
        <ScorecardSkillsGradeCard
          skills={[skill]}
          grades={{ 'skill-ai-fluency': 'performing' }}
          priorOnly
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('region', { name: 'Skills (previously graded)' }),
    ).toBeTruthy()
    expect(
      screen.getByText('Saved grades. Not counted while Skills is off.'),
    ).toBeTruthy()
    expect(screen.getByText('Performing')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'AI Fluency grade' })).toBeNull()
  })
})
