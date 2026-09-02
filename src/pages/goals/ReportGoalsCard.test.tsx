import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalEditLockNotice } from './GoalEditLockNotice'
import { ReportGoalsCard, ReportGoalsEmpty } from './ReportGoalsCard'

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
    const awaiting = screen.getByText('3 goals awaiting your approval')
    expect(awaiting.nextElementSibling).toHaveTextContent('Approve')
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
        <ReportGoalsEmpty personName="Saif Ivna Alam" />
      </ReportGoalsCard>,
    )

    expect(screen.getByText('Not started')).toBeInTheDocument()
    expect(screen.getByText('No Goals Yet')).toBeInTheDocument()
    expect(screen.getByText('Saif has not added goals for this cycle.')).toBeInTheDocument()
    expect(screen.queryByText('0 goals · Not started')).not.toBeInTheDocument()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('uses the same lock copy as My Goals when the cycle is not open', () => {
    render(
      <ReportGoalsEmpty
        personName="Saif Ivna Alam"
        lockMessage="Goal editing opens 7 Dec 2026 and closes 1 Jan 2027."
      />,
    )

    expect(screen.getByText('No Goals Yet')).toBeInTheDocument()
    expect(
      screen.getByText('Goal editing opens 7 Dec 2026 and closes 1 Jan 2027.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Saif has not added goals for this cycle.'),
    ).not.toBeInTheDocument()
  })

  it('offers Add Goal when the reviewer can start the set', () => {
    const onAdd = vi.fn()
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ id: '1', name: 'Saif Ivna Alam' }}
          cycleId="q3-2026"
          status="draft"
          goalCount={0}
        >
          <ReportGoalsEmpty
            personName="Saif Ivna Alam"
            canAdd
            onAdd={onAdd}
          />
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Add one for Saif, or wait for them to start.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Saif Ivna Alam' }),
    ).toHaveAttribute('href', '/goals/q3-2026/1')
    fireEvent.click(screen.getByRole('button', { name: 'Add Goal' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('does not repeat Approved in the subtitle when the badge is showing', () => {
    render(
      <ReportGoalsCard
        person={{ name: 'Saif Ivna Alam' }}
        status="approved"
        goalCount={3}
      >
        <p>Improve delivery quality</p>
      </ReportGoalsCard>,
    )

    expect(screen.getByText('3 goals')).toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.queryByText('3 goals · Approved')).not.toBeInTheDocument()
  })

  it('marks a late submission awaiting final skip-level approval', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Aminul Islam' }}
          status="submitted"
          postWindowApprovalStage="manager_manager"
          skipLevelManager={{ id: '42', name: 'Nafis' }}
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

    expect(screen.getByText('Late Submission')).toBeInTheDocument()
    expect(
      screen.getByRole('list', { name: /Awaiting Nafis/ }),
    ).toHaveTextContent('Nafis')
    expect(
      screen.getByText('3 goals awaiting your approval').nextElementSibling,
    ).toHaveTextContent('Approve')
  })

  it('shows the employee late justification on the late banner', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Aminul Islam' }}
          status="submitted"
          postWindowApprovalStage="manager"
          skipLevelManager={{ id: '42', name: 'Nafis' }}
          goalCount={3}
          canApprove
          canSendBack
          lateJustification="I was on leave until last week."
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

    const banner = screen.getByLabelText('Late Submission')
    expect(banner).toHaveTextContent('Late reason')
    expect(banner).toHaveTextContent('I was on leave until last week.')
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
    const trail = screen.getByRole('list', { name: /Awaiting Nafis/ })
    expect(trail).toHaveTextContent('Nafis')
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
      screen.getByRole('list', { name: /Awaiting Manager, then Nafis/ }),
    ).toHaveTextContent('Nafis')
  })

  it('shows the same late banner on a draft the manager is reviewing', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Saif Ivna Alam' }}
          status="draft"
          allowLateSubmissions
          deadlineMissedAt="2026-07-01"
          lineManager={{ id: '7', name: 'Api Singha' }}
          skipLevelManager={{ id: '42', name: 'Angie Ng Yun Ni' }}
          goalCount={1}
        >
          <p>Improve delivery quality</p>
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    const banner = screen.getByLabelText('Late Submission')
    const trail = screen.getByRole('list', {
      name: 'Late submission. Api Singha, then Angie Ng Yun Ni',
    })
    expect(banner).toHaveTextContent('2 Level Approval Required')
    expect(banner).toContainElement(trail)
    expect(trail).toHaveTextContent('Api Singha')
    expect(trail).toHaveTextContent('Angie Ng Yun Ni')
    expect(trail).not.toHaveTextContent('You')
  })

  it('shows the owner submit actions and who will approve after they submit', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Saif Ivna Alam' }}
          status="draft"
          goalCount={3}
          perspective="owner"
          lineManager={{ id: '7', name: 'Api Singha' }}
          actions={
            <>
              <button type="button">Submit All</button>
              <button type="button">Add Goal</button>
            </>
          }
        >
          <p>Improve delivery quality</p>
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    const card = screen.getByRole('region', { name: 'Saif Ivna Alam goals' })
    const trail = screen.getByRole('list', { name: 'You, then Api Singha' })
    expect(card).not.toHaveTextContent('3 goals · Draft')
    expect(card).not.toContainElement(trail)
    expect(trail).toHaveTextContent('You')
    expect(trail).toHaveTextContent('Api Singha')
    expect(card).not.toHaveTextContent('Awaiting')
    expect(screen.getByRole('button', { name: 'Submit All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Goal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('asks the owner for changes after a send-back, not further approval', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Aminul Islam Borhan' }}
          status="sent_back"
          allowLateSubmissions
          goalCount={2}
          perspective="owner"
          lineManager={{ id: '7', name: 'Api Singha' }}
          skipLevelManager={{ id: '42', name: 'Angie Ng Yun Ni' }}
          actions={
            <>
              <button type="button">Resubmit All</button>
              <button type="button">Add Goal</button>
            </>
          }
        >
          <p>Improve delivery quality</p>
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    const card = screen.getByRole('region', {
      name: 'Aminul Islam Borhan goals',
    })
    const trail = screen.getByRole('list', {
      name: 'Late submission. Needs changes, then Api Singha, then Angie Ng Yun Ni',
    })
    const banner = screen.getByLabelText('Late Submission')
    expect(banner).toContainElement(trail)
    expect(card).not.toContainElement(banner)
    expect(card).not.toContainElement(trail)
    expect(trail).toHaveTextContent('Api Singha')
    expect(trail).toHaveTextContent('Angie Ng Yun Ni')
    expect(trail).not.toHaveTextContent('Awaiting')
    expect(screen.getByRole('button', { name: 'Resubmit All' })).toBeInTheDocument()
  })

  it('asks for changes before naming the next approver on a sent-back draft', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Saif Ivna Alam' }}
          status="sent_back"
          goalCount={2}
          perspective="owner"
          lineManager={{ id: '7', name: 'Api Singha' }}
          actions={<button type="button">Resubmit All</button>}
        >
          <p>Improve delivery quality</p>
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    const card = screen.getByRole('region', { name: 'Saif Ivna Alam goals' })
    const trail = screen.getByRole('list', {
      name: 'Needs changes, then Api Singha',
    })
    expect(card).not.toContainElement(trail)
    expect(trail).toHaveTextContent('Changes needed')
    expect(trail).toHaveTextContent('Api Singha')
    expect(card).not.toHaveTextContent('Awaiting')
  })

  it('names both approvers on a late owner submission', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Saif Ivna Alam' }}
          status="submitted"
          postWindowApprovalStage="manager"
          goalCount={3}
          perspective="owner"
          lineManager={{ id: '7', name: 'Api Singha' }}
          skipLevelManager={{ id: '42', name: 'Nafis' }}
        >
          <p>Improve delivery quality</p>
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    expect(screen.queryByText('3 goals awaiting approval')).not.toBeInTheDocument()
    const trail = screen.getByRole('list', {
      name: 'Late submission. Awaiting Api Singha, then Nafis',
    })
    expect(trail).toHaveTextContent('Api Singha')
    expect(trail).toHaveTextContent('Nafis')
  })

  it('shows a read-only ribbon in the same slot as late submission', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Saif Ivna Alam' }}
          status="draft"
          goalCount={0}
          perspective="owner"
          lineManager={{ id: '7', name: 'Api Singha' }}
          lockBanner={
            <GoalEditLockNotice
              layout="ribbon"
              message="Goal editing opens 7 Dec 2026 and closes 1 Jan 2027."
            />
          }
        >
          <p>Improve delivery quality</p>
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    const banner = screen.getByRole('status', {
      name: 'Goal editing opens 7 Dec 2026 and closes 1 Jan 2027.',
    })
    const card = screen.getByRole('region', { name: 'Saif Ivna Alam goals' })
    expect(banner).toHaveTextContent('Read Only')
    expect(banner).toHaveTextContent(
      'Goal editing opens 7 Dec 2026 and closes 1 Jan 2027.',
    )
    expect(banner.parentElement).toHaveClass('pd-goals-approval-wrap--lock')
    expect(card).not.toContainElement(banner)
    expect(
      screen.queryByRole('list', { name: 'You, then Api Singha' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Api Singha')).not.toBeInTheDocument()
  })

  it('keeps late submission instead of the read-only ribbon', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Saif Ivna Alam' }}
          status="draft"
          allowLateSubmissions
          deadlineMissedAt="2026-07-01"
          lineManager={{ id: '7', name: 'Api Singha' }}
          goalCount={1}
          lockBanner={
            <GoalEditLockNotice
              layout="ribbon"
              message="Q2 2026 is closed, so goals are read-only."
            />
          }
        >
          <p>Improve delivery quality</p>
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Late Submission')).toBeInTheDocument()
    expect(
      screen.queryByRole('status', {
        name: 'Q2 2026 is closed, so goals are read-only.',
      }),
    ).not.toBeInTheDocument()
  })

  it('shows the activity overflow on hover', () => {
    render(
      <MemoryRouter>
        <ReportGoalsCard
          person={{ name: 'Saif Ivna Alam' }}
          status="submitted"
          goalCount={3}
          canApprove
          canSendBack
          activityFilters={{ cycleId: 'q3', subjectEmployeeId: 1 }}
        >
          <p>Improve delivery quality</p>
        </ReportGoalsCard>
      </MemoryRouter>,
    )

    const trigger = screen.getByRole('button', {
      name: 'More Actions For Saif Ivna Alam',
    })
    expect(
      screen.queryByRole('menuitem', { name: 'View Activity' }),
    ).not.toBeInTheDocument()

    fireEvent.mouseEnter(trigger.closest('.pd-goal-view__menu')!)
    expect(
      screen.getByRole('menuitem', { name: 'View Activity' }),
    ).toBeInTheDocument()
  })
})
