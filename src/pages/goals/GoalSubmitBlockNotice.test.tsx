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

  it('lists every blocker so global and later goal issues stay visible', () => {
    render(
      <GoalSubmitBlockNotice
        blockers={[
          { reason: 'Weights need to add up to 100%.' },
          {
            reason: 'Ship quality needs a title.',
            goalId: 'g1',
            goalTitle: 'Ship quality',
            suffix: ' needs a title.',
          },
        ]}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Weights need to add up to 100%',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('needs a title')
  })
})
