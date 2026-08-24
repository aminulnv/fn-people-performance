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
            reason: 'Ada’s quality goal still needs a metric — or remove it.',
            goalId: 'goal-cascade',
            goalTitle: 'Ada’s quality goal',
            suffix: ' still needs a metric — or remove it.',
          },
        ]}
        onOpenGoal={onOpenGoal}
      />,
    )

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('Action required')
    fireEvent.click(
      screen.getByRole('button', { name: 'Ada’s quality goal' }),
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

  it('offers a button to add a goal when the set is too small', () => {
    const onAddGoal = vi.fn()
    render(
      <GoalSubmitBlockNotice
        layout="ribbon"
        blockers={[
          { reason: 'Add at least 2 goals.', action: 'add_goal' },
          { reason: 'Weights need to add up to 100%.' },
        ]}
        onAddGoal={onAddGoal}
        addGoalLabel="Add another goal"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add another goal' }))
    expect(onAddGoal).toHaveBeenCalledOnce()
  })

  it('hides the add button when the set is not short of goals', () => {
    render(
      <GoalSubmitBlockNotice
        blockers={[{ reason: 'Weights need to add up to 100%.' }]}
        onAddGoal={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /add/i })).toBeNull()
  })

  it('renders a flush ribbon when asked', () => {
    render(
      <GoalSubmitBlockNotice
        layout="ribbon"
        blockers={[{ reason: 'Add at least 2 goals.' }]}
      />,
    )

    expect(screen.getByRole('alert')).toHaveClass('pd-goals-sendback--ribbon')
  })

  it('drops the goal name in the ribbon because the window is already that goal', () => {
    render(
      <GoalSubmitBlockNotice
        layout="ribbon"
        nameTheGoal={false}
        blockers={[
          {
            reason: 'Untitled goal 1 needs a title.',
            goalId: 'g1',
            goalTitle: 'Untitled goal 1',
            suffix: ' needs a title.',
          },
        ]}
        onOpenGoal={vi.fn()}
      />,
    )

    const ribbon = screen.getByRole('alert')
    expect(ribbon).toHaveTextContent('Action required')
    expect(ribbon).toHaveTextContent('Needs a title.')
    expect(ribbon).not.toHaveTextContent('Untitled goal 1')
    expect(screen.queryByRole('button', { name: 'Untitled goal 1' })).toBeNull()
  })
})
