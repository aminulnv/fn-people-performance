import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CORE_VALUES } from '@/lib/values/catalog'
import { ScorecardValuesGradeCard } from './ScorecardValuesGradeCard'

afterEach(() => cleanup())

describe('ScorecardValuesGradeCard', () => {
  it('lets the manager grade each company value directly', () => {
    const onGradeChange = vi.fn()
    render(
      <ScorecardValuesGradeCard
        values={CORE_VALUES.slice(0, 1)}
        grades={{}}
        editing
        onGradeChange={onGradeChange}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Move Fast, Chase Excellence grade' }),
    )
    fireEvent.click(screen.getByRole('option', { name: 'Exceeding' }))
    expect(onGradeChange).toHaveBeenCalledWith('move-fast', 'exceeding')
    fireEvent.click(
      screen.getByRole('button', { name: 'Move Fast, Chase Excellence grade' }),
    )
    fireEvent.click(screen.getByRole('option', { name: 'Unsatisfactory' }))
    expect(onGradeChange).toHaveBeenCalledWith('move-fast', 'unsatisfactory')
  })

  it('keeps the list compact and shows the grading guide on hover', () => {
    render(
      <ScorecardValuesGradeCard
        values={CORE_VALUES.slice(0, 1)}
        grades={{ 'move-fast': 'performing' }}
      />,
    )
    expect(screen.getByText(/We're all about excellence/)).toBeTruthy()
    expect(
      screen.queryByText(/Moves quickly on reversible work/),
    ).toBeNull()

    const tip = screen
      .getByRole('button', {
        name: 'Move Fast, Chase Excellence grading guide',
      })
      .closest('.pd-tooltip')
    expect(tip).toBeTruthy()
    fireEvent.mouseEnter(tip!)

    expect(screen.getByText('Unsatisfactory')).toBeTruthy()
    expect(screen.getByText('Developing')).toBeTruthy()
    expect(screen.getAllByText('Performing').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Exceeding')).toBeTruthy()
    expect(screen.getByText('Exceptional')).toBeTruthy()
    expect(
      screen.getByText(/Moves quickly on reversible work/),
    ).toBeTruthy()
  })

  it('shows catalog rubrics when the live value has empty behaviours', () => {
    render(
      <ScorecardValuesGradeCard
        values={[
          {
            id: 'debate-commit',
            name: 'Debate Openly, Commit Fully',
            description: 'At NEXT, every voice matters.',
            status: 'enabled',
            playbookUrl: null,
            behaviours: [],
          },
        ]}
        grades={{}}
        editing
        onGradeChange={() => {}}
      />,
    )
    const tip = screen
      .getByRole('button', {
        name: 'Debate Openly, Commit Fully grading guide',
      })
      .closest('.pd-tooltip')
    fireEvent.mouseEnter(tip!)
    expect(
      screen.getByText(/Challenges ideas respectfully before decisions/),
    ).toBeTruthy()
  })
})
