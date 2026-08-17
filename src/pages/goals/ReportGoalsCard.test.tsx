import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

  it('says Not started rather than Draft when no goals exist', () => {
    render(
      <ReportGoalsCard
        person={{ name: 'Saif Ivna Alam' }}
        status="draft"
        goalCount={0}
        canApprove={false}
        canSendBack={false}
        busy={false}
        sendBackOpen={false}
        sendBackReason=""
        onToggleSendBack={vi.fn()}
        onSendBackReason={vi.fn()}
        onApprove={vi.fn()}
        onSendBack={vi.fn()}
      >
        <p>No goals added for this cycle yet.</p>
      </ReportGoalsCard>,
    )

    expect(screen.getByText('0 goals · Not started')).toBeInTheDocument()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('marks a late submission awaiting final skip-level approval', () => {
    render(
      <ReportGoalsCard
        person={{ name: 'Aminul Islam' }}
        status="submitted"
        postWindowApprovalStage="manager_manager"
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

    expect(
      screen.getByText('Late submission · your approval is final'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('3 goals awaiting your approval'),
    ).toBeInTheDocument()
  })

  it('tells the line manager who still owes final approval after they signed off', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Aminul Islam Borhan' }}
          status="submitted"
          postWindowApprovalStage="manager_manager"
          skipLevelManager={{
            id: '42',
            name: 'Nafis',
            avatarUrl: 'https://cdn.example.com/nafis.png',
          }}
          goalCount={3}
          canApprove={false}
          canSendBack={false}
          busy={false}
          sendBackOpen={false}
          sendBackReason=""
          onToggleSendBack={vi.fn()}
          onSendBackReason={vi.fn()}
          onApprove={vi.fn()}
          onSendBack={vi.fn()}
        >
          <p>Improve delivery quality</p>
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    expect(screen.getByText('3 goals · Pending final approval')).toBeInTheDocument()
    const note = screen
      .getByText(/Late submission/)
      .closest('.pd-goals-approval__late')
    expect(note).toHaveTextContent("awaiting")
    expect(note).toHaveTextContent('Nafis')
    expect(note).toHaveTextContent("final approval")
    expect(screen.getByRole('link', { name: /Nafis/ })).toHaveAttribute(
      'href',
      '/people/42',
    )
  })

  it('names the skip-level manager who will approve after this manager', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Aminul Islam Borhan' }}
          status="submitted"
          postWindowApprovalStage="manager"
          skipLevelManager={{
            id: '42',
            name: 'Nafis',
            avatarUrl: 'https://cdn.example.com/nafis.png',
          }}
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
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    const personLink = screen.getByRole('link', { name: /Nafis/ })
    expect(personLink).toHaveAttribute('href', '/people/42')
    expect(personLink).toHaveTextContent('Nafis')
    expect(
      screen.getByText(/Late submission/).closest('.pd-goals-approval__late'),
    ).toHaveTextContent('will approve after you')
  })
})
