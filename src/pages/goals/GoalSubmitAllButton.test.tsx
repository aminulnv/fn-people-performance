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
        reasons={[]}
        onSubmit={onSubmit}
      />,
    )

    const button = screen.getByRole('button', { name: 'Resubmit All' })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows why submit is blocked instead of failing silently', () => {
    render(
      <GoalSubmitAllButton
        status="sent_back"
        busy={false}
        reasons={[
          'The goal cascaded from Ada still needs a measure — or remove it.',
        ]}
        onSubmit={vi.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: 'Resubmit All' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute(
      'title',
      'The goal cascaded from Ada still needs a measure — or remove it.',
    )
  })

  it('asks for confirmation for a non-blocking goal-count warning', () => {
    const onSubmit = vi.fn()
    render(
      <GoalSubmitAllButton
        status="draft"
        busy={false}
        reasons={[]}
        warning="You have 2 goals. We recommend setting 3 to 5 goals."
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit All' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'We recommend setting 3 to 5 goals',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit anyway' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
