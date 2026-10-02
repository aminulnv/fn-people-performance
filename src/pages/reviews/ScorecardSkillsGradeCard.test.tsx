import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ScorecardSkillsGradeCard } from './ScorecardSkillsGradeCard'
import type { Skill } from '@/lib/skills/types'
import { emptySkillMastery } from '@/lib/skills/types'

const skill: Skill = {
  id: 'skill-ai-fluency',
  name: 'AI Fluency',
  role: '',
  status: 'active',
  mastery: emptySkillMastery(),
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
    expect(screen.getByText('No skills on their role yet')).toBeTruthy()
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
    fireEvent.click(screen.getByRole('option', { name: 'Intermediate' }))
    expect(onGradeChange).toHaveBeenCalledWith('skill-ai-fluency', 'intermediate')
  })

  it('shows the expected level from the role matrix', () => {
    render(
      <MemoryRouter>
        <ScorecardSkillsGradeCard
          skills={[{ ...skill, expectedHint: 'Expected: Expert for IC2' }]}
          grades={{}}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Expected: Expert for IC2')).toBeTruthy()
  })

  it('shows mastery rubric bands when mastery text is set', () => {
    render(
      <MemoryRouter>
        <ScorecardSkillsGradeCard
          skills={[
            {
              ...skill,
              mastery: {
                ...emptySkillMastery(),
                intermediate: 'Applies the skill reliably on day-to-day work.',
                expert: 'Sets the bar for the org on this skill.',
              },
            },
          ]}
          grades={{ 'skill-ai-fluency': 'intermediate' }}
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByText('Applies the skill reliably on day-to-day work.'),
    ).toBeTruthy()
    expect(
      screen.getByText('Sets the bar for the org on this skill.'),
    ).toBeTruthy()
    expect(screen.queryByText('Unsatisfactory')).toBeNull()
  })

  it('shows read-only grades on the view scorecard', () => {
    render(
      <MemoryRouter>
        <ScorecardSkillsGradeCard
          skills={[skill]}
          grades={{ 'skill-ai-fluency': 'advanced' }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Advanced')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'AI Fluency grade' })).toBeNull()
  })

  it('maps legacy performance bands to mastery labels', () => {
    render(
      <MemoryRouter>
        <ScorecardSkillsGradeCard
          skills={[skill]}
          grades={{ 'skill-ai-fluency': 'exceeding' }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Advanced')).toBeTruthy()
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
    expect(screen.getByText('Intermediate')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'AI Fluency grade' })).toBeNull()
  })
})
