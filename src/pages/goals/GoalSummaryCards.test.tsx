import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '@/lib/goals/types'
import { GoalSummaryCards } from './GoalSummaryCards'

afterEach(cleanup)

const goal: Goal = {
  id: 'g1',
  description: 'Ship quality',
  weight: 40,
  goalType: 'outcome',
  processType: 'bau',
  priority: 'medium',
  progressStatus: 'on_track',
  measurements: [],
}

describe('GoalSummaryCards', () => {
  it('shows the same four stats in read and edit', () => {
    render(
      <GoalSummaryCards
        goal={goal}
        status="draft"
        cycleLabel="Q3 2026"
        isCurrentCycle
      />,
    )

    const summary = screen.getByRole('group', { name: 'Goal summary' })
    expect(summary).toHaveTextContent('Q3 2026')
    expect(summary).toHaveTextContent('Current')
    expect(summary).toHaveTextContent('On track')
    expect(summary).toHaveTextContent('40%')
    expect(summary).toHaveTextContent('Completion')
  })

  it('lets weight be edited when the cards are on the write view', () => {
    const onWeightChange = vi.fn()
    render(
      <GoalSummaryCards
        goal={goal}
        status="draft"
        cycleLabel="Q3 2026"
        onWeightChange={onWeightChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Goal weight'), {
      target: { value: '55' },
    })
    expect(onWeightChange).toHaveBeenCalledWith(55)
  })
})
