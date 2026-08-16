import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GoalApprovalStatus } from './GoalApprovalStatus'

afterEach(cleanup)

describe('GoalApprovalStatus', () => {
  it('shows Sent back instead of a blank dash', () => {
    render(<GoalApprovalStatus status="sent_back" />)
    expect(screen.getByText('Sent back')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('keeps draft as a dash because approval has not started', () => {
    render(<GoalApprovalStatus status="draft" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows pending and approved marks', () => {
    const { rerender } = render(<GoalApprovalStatus status="submitted" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
    rerender(<GoalApprovalStatus status="approved" />)
    expect(screen.getByLabelText('Approved')).toBeInTheDocument()
  })
})
