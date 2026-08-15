import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalReviewActions } from './GoalReviewActions'

afterEach(cleanup)

describe('GoalReviewActions', () => {
  it('shows batch approve and send back on a report goals page', () => {
    render(
      <GoalReviewActions
        personName="Direct Report"
        canApprove
        canSendBack
        busy={false}
        sendBackReason=""
        onSendBackReason={vi.fn()}
        onApprove={vi.fn()}
        onSendBack={vi.fn()}
      />,
    )

    expect(screen.getByText('Awaiting your approval')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Back' })).toBeInTheDocument()
  })

  it('renders nothing when the viewer cannot review', () => {
    const { container } = render(
      <GoalReviewActions
        personName="Direct Report"
        canApprove={false}
        canSendBack={false}
        busy={false}
        sendBackReason=""
        onSendBackReason={vi.fn()}
        onApprove={vi.fn()}
        onSendBack={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('asks for a reason before sending the batch back', () => {
    const onSendBack = vi.fn()
    const onSendBackReason = vi.fn()

    render(
      <GoalReviewActions
        personName="Direct Report"
        canApprove
        canSendBack
        busy={false}
        sendBackReason="Tighten the metric"
        onSendBackReason={onSendBackReason}
        onApprove={vi.fn()}
        onSendBack={onSendBack}
        variant="inline"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Send Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Send Back' }))
    expect(onSendBack).toHaveBeenCalledTimes(1)
  })
})
