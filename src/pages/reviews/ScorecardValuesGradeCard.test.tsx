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

  it('shows the value description without a behaviour rubric', () => {
    render(
      <ScorecardValuesGradeCard
        values={CORE_VALUES.slice(0, 1)}
        grades={{ 'move-fast': 'performing' }}
      />,
    )
    expect(screen.getByText(/We're all about excellence/)).toBeTruthy()
    expect(screen.queryByText('Developing')).toBeNull()
    expect(
      screen.queryByText(/Moves quickly on reversible work/),
    ).toBeNull()
  })
})
