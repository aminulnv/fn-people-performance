import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReportGoalsCard } from './ReportGoalsCard'

afterEach(cleanup)

describe('ReportGoalsCard', () => {
  it('nests goals under the person and batch review actions', () => {
    render(
      <ReportGoalsCard
        person={{ name: 'Saif Ivna Alam' }}
        status="submitted"
        goalCount={3}
        canApprove
        canSendBack
        busy={false}
        sendBackOpen={false}
        sendBackReason=""
        onToggleSendBack={vi.fn()}
        onSendBackReason={vi.fn()}
        onApprove={vi.fn()}
        onSendBack={vi.fn()}
      >
        <p>Improve delivery quality</p>
      </ReportGoalsCard>,
    )

    const card = screen.getByRole('region', { name: 'Saif Ivna Alam goals' })
    expect(card).toHaveTextContent('3 goals awaiting your approval')
    expect(card).toHaveTextContent('Improve delivery quality')
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Back' })).toBeInTheDocument()
  })
})
