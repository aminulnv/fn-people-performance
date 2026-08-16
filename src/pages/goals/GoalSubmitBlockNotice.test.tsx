import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalSubmitBlockNotice } from './GoalSubmitBlockNotice'

afterEach(cleanup)

describe('GoalSubmitBlockNotice', () => {
  it('opens the named goal so the owner can fix it', () => {
    const onOpenGoal = vi.fn()
    render(
      <GoalSubmitBlockNotice
        blockers={[
          {
            reason:
              'Untitled Cascading Goal from Ada still needs a measure — or remove it.',
            goalId: 'goal-cascade',
            goalTitle: 'Untitled Cascading Goal from Ada',
            suffix: ' still needs a measure — or remove it.',
          },
        ]}
        onOpenGoal={onOpenGoal}
      />,
    )

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('Action required')
    fireEvent.click(
      screen.getByRole('button', { name: 'Untitled Cascading Goal from Ada' }),
    )
    expect(onOpenGoal).toHaveBeenCalledWith('goal-cascade')
  })
})
