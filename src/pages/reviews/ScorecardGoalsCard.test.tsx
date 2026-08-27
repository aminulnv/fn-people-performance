import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Goal } from '@/lib/goalsApi'
import { ScorecardGoalsCard } from './ScorecardGoalsCard'

afterEach(() => {
  cleanup()
})

function goal(partial: Partial<Goal> & Pick<Goal, 'id' | 'description'>): Goal {
  return {
    weight: 50,
    measurements: [],
    ...partial,
  }
}

describe('ScorecardGoalsCard', () => {
  it('does not call an empty goal set performing', () => {
    render(
      <MemoryRouter>
        <ScorecardGoalsCard
          cycleLabel="Q1 2026"
          goals={[]}
          overallPercent={0}
          overallBand={null}
          goalsHref="/goals/q1-2026/969"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('No Goals For Q1 2026')).toBeTruthy()
    expect(screen.queryByText('Performing')).toBeNull()
    expect(screen.getByRole('link', { name: 'Open Goals' })).toHaveAttribute(
      'href',
      '/goals/q1-2026/969',
    )
  })

  it('shows completion without inventing a grade', () => {
    render(
      <MemoryRouter>
        <ScorecardGoalsCard
          cycleLabel="Q3 2026"
          goals={[
            goal({
              id: 'g1',
              description: 'Improve delivery quality',
              weight: 100,
            }),
          ]}
          overallPercent={35}
          overallBand={null}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('35% complete')).toBeTruthy()
    expect(screen.queryByText('Unsatisfactory')).toBeNull()
  })

  it('renders the profile goals table with expandable measures', () => {
    render(
      <MemoryRouter>
        <ScorecardGoalsCard
          cycleLabel="Q1 2026"
          goals={[
            goal({
              id: 'g1',
              description: 'Improve delivery quality',
              weight: 100,
              measurements: [
                {
                  id: 'm1',
                  kind: 'metric',
                  title: 'Defects closed',
                  weight: 100,
                  unit: 'number',
                  direction: 'increase',
                  startValue: 0,
                  targetValue: 10,
                  currentValue: 4,
                },
              ],
            }),
          ]}
          overallPercent={40}
          overallBand="developing"
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('table', { name: 'Goals for Q1 2026' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Goals' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Weight 100%' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Progress' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Metrics' })).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: 'Metric' })).toBeNull()
    expect(screen.queryByText('Defects closed')).toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Improve delivery quality',
      }),
    )

    expect(screen.getByText('Defects closed')).toBeTruthy()
  })

  it('puts the goals grade next to the Goals heading', () => {
    render(
      <MemoryRouter>
        <ScorecardGoalsCard
          cycleLabel="Q3 2026"
          goals={[
            goal({
              id: 'g1',
              description: 'Improve delivery quality',
              weight: 100,
            }),
          ]}
          overallPercent={40}
          overallBand="developing"
          editing
          goalsWeight={50}
          goalsGrade="exceeding"
          onGoalsGradeChange={() => undefined}
        />
      </MemoryRouter>,
    )

    const heading = screen.getByRole('heading', { name: 'Goals' })
    const gradeTrigger = screen.getByRole('button', { name: 'Goals (50%)' })
    expect(heading.parentElement?.contains(gradeTrigger)).toBe(true)
    expect(screen.queryByText('40% complete')).toBeTruthy()
    expect(gradeTrigger.textContent).toContain('Exceeding')
    expect(screen.queryByRole('combobox')).toBeNull()

    fireEvent.click(gradeTrigger)
    expect(screen.getByRole('listbox')).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Performing' })).toBeTruthy()
    expect(gradeTrigger.closest('.pd-listbox')?.className).toContain(
      'pd-reviews-scorecard__grade-select--exceeding',
    )
    expect(
      screen.getByRole('option', { name: 'Performing' }).className,
    ).toContain('pd-reviews-scorecard__grade-tone--performing')
  })

  it('opens the goal view window when a goal row is clicked', () => {
    render(
      <MemoryRouter>
        <ScorecardGoalsCard
          cycleId="q3-2026"
          personId="871"
          owner={{ id: '871', name: 'Saif Ivna Alam' }}
          cycleLabel="Q3 2026"
          goals={[
            goal({
              id: 'g1',
              description: 'Improve delivery quality',
              weight: 100,
            }),
          ]}
          overallPercent={40}
          overallBand={null}
          goalsHref="/goals/q3-2026/871"
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Goals' })).toHaveAttribute(
      'href',
      '/goals/q3-2026/871',
    )
    fireEvent.click(screen.getByText('Improve delivery quality'))
    const drawer = screen.getByRole('dialog', {
      name: 'View Improve delivery quality',
    })
    expect(drawer).toBeTruthy()
    expect(drawer).toHaveTextContent('Improve delivery quality')
  })
})
