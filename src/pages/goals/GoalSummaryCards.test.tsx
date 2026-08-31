import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '@/lib/goals/types'
import { GoalSummaryCards } from './GoalSummaryCards'

afterEach(cleanup)

const goal: Goal = {
  id: 'g1',
  description: 'Ship quality',
  weight: 40,
  measurements: [],
}

describe('GoalSummaryCards', () => {
  it('shows goal weight without cycle capacity copy', () => {
    render(<GoalSummaryCards goal={goal} />)

    expect(screen.getByText('Goal Weight %')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.queryByText('40%')).not.toBeInTheDocument()
    expect(screen.queryByText(/used/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/left/i)).not.toBeInTheDocument()
  })

  it('lets weight be edited when the cards are on the write view', () => {
    const onWeightChange = vi.fn()
    render(
      <GoalSummaryCards goal={goal} onWeightChange={onWeightChange} />,
    )

    const field = screen.getByRole('textbox', { name: 'Goal Weight %' })
    fireEvent.change(field, {
      target: { value: '55' },
    })
    expect(onWeightChange).not.toHaveBeenCalled()
    fireEvent.blur(field)
    expect(onWeightChange).toHaveBeenCalledWith(55)
  })

  it('steps goal weight in five-percent increments', () => {
    const onWeightChange = vi.fn()
    render(
      <GoalSummaryCards goal={goal} onWeightChange={onWeightChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Increase Goal Weight %' }))
    expect(onWeightChange).toHaveBeenCalledWith(45)
  })
})
