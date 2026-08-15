import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '@/lib/goals/types'
import { GoalDetailView } from './GoalDetailView'

afterEach(cleanup)

const goal: Goal = {
  id: 'goal-1',
  description: 'Improve delivery quality',
  weight: 100,
  measurements: [],
}

describe('GoalDetailView', () => {
  it('shows submission status without per-goal approve actions', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="submitted"
        commentAuthorName="Manager"
        onChange={vi.fn()}
        onSelectIndex={vi.fn()}
      />,
    )

    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Send Back' }),
    ).not.toBeInTheDocument()
  })
})
