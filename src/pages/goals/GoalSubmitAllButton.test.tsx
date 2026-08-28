import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { GoalSubmitAllButton } from './GoalSubmitAllButton'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

afterEach(cleanup)

describe('GoalSubmitAllButton', () => {
  it('lets the owner resubmit sent-back goals', () => {
    const onSubmit = vi.fn()
    render(
      <GoalSubmitAllButton
        status="sent_back"
        busy={false}
        blockers={[]}
        onSubmit={onSubmit}
      />,
    )

    const button = screen.getByRole('button', { name: 'Resubmit All' })
    expect(button).toHaveClass('pd-people__ghost-btn--success')
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows table errors on hover when submit is blocked', async () => {
    render(
      <GoalSubmitAllButton
        status="sent_back"
        busy={false}
        blockers={[
          {
            reason: 'The goal cascaded from Ada still needs a metric — or remove it.',
            goalId: 'goal-1',
            goalTitle: 'The goal cascaded from Ada',
            suffix: ' still needs a metric — or remove it.',
          },
        ]}
        onSubmit={vi.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: 'Resubmit All' })
    expect(button).toBeDisabled()
    fireEvent.mouseEnter(button.closest('.pd-tooltip')!)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent(
      'The goal cascaded from Ada: Still needs a metric — or remove it.',
    )
  })

  it('lists every table fix on the disabled submit button', async () => {
    render(
      <GoalSubmitAllButton
        status="draft"
        busy={false}
        blockers={[
          { reason: 'Add at least 2 goals.', action: 'add_goal' },
          { reason: 'Every goal needs a weight.' },
          {
            reason: 'test still needs a metric.',
            goalId: 'goal-test',
            goalTitle: 'test',
            suffix: ' still needs a metric.',
          },
        ]}
        onSubmit={vi.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: 'Submit All' })
    expect(button).toBeDisabled()
    fireEvent.mouseEnter(button.closest('.pd-tooltip')!)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Add at least 2 goals.')
    expect(tip).toHaveTextContent('Every goal needs a weight.')
    expect(tip).toHaveTextContent('test: Still needs a metric.')
  })

  it('asks for confirmation for a non-blocking goal-count warning', () => {
    const onSubmit = vi.fn()
    render(
      <GoalSubmitAllButton
        status="draft"
        busy={false}
        blockers={[]}
        warning="You have 2 goals. We recommend setting 3 to 5 goals."
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit All' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'We recommend setting 3 to 5 goals',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit Anyway' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('requires a justification when submitting after the deadline', () => {
    const onSubmit = vi.fn()
    render(
      <GoalSubmitAllButton
        status="draft"
        busy={false}
        blockers={[]}
        requiresLateJustification
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit All' }))

    expect(onSubmit).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Submit after the deadline?')
    expect(screen.getByRole('button', { name: 'Submit Late Goals' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Why are these goals late?'), {
      target: { value: 'I was on leave until last week.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit Late Goals' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('I was on leave until last week.')
  })
})
