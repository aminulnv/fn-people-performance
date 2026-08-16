import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalSubmitAllButton } from './GoalSubmitAllButton'

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
})
