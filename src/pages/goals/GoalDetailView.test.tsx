import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '@/lib/goals/types'
import { GoalDetailView } from './GoalDetailView'

vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui')>(
    '@/components/ui',
  )
  return {
    ...actual,
    Modal: ({
      open,
      title,
      children,
      actions,
    }: {
      open: boolean
      title: string
      children?: ReactNode
      actions?: ReactNode
    }) =>
      open ? (
        <div role="dialog" aria-label={title}>
          {children}
          {actions}
        </div>
      ) : null,
  }
})

afterEach(cleanup)

const goal: Goal = {
  id: 'goal-1',
  description: 'Improve delivery quality',
  weight: 100,
  measurements: [],
}

function showTab(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
}

function startEditing() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }))
}

describe('GoalDetailView', () => {
  it('shows submission status without per-goal approve actions', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="submitted"
        commentAuthorName="Manager"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    showTab('Details')
    expect(screen.getByText('Waiting on manager')).toBeInTheDocument()
    expect(
      screen.getByText('Waiting on manager').closest('.pd-goal-view__approval'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Send Back' }),
    ).not.toBeInTheDocument()
  })

  it('keeps goal weight beside the owner name', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
      />,
    )

    const owner = screen.getByText('Aminul Islam Borhan')
    const byline = owner.closest('.pd-goal-view__byline')
    expect(byline).toHaveTextContent('Goal weight')
    expect(byline).toHaveTextContent('100%')
    expect(byline).not.toHaveTextContent('Draft')
    expect(
      screen.getByRole('heading', { name: /Improve delivery quality/ }),
    ).toHaveTextContent('Draft')
  })

  it('shows the manager avatar on the pending approval card', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cascadeFrom={{
          managerName: 'Line Manager',
          managerAvatarUrl: 'https://cdn.example.com/manager.png',
          options: [],
        }}
        cycleLabel="Q3 2026"
        status="submitted"
        commentAuthorName="Manager"
        onChange={vi.fn()}
      />,
    )

    showTab('Details')
    const avatar = screen.getByRole('img', { name: 'Approver Line Manager' })
    const person = avatar.closest('.pd-goal-view__approval-person')
    expect(person).toHaveTextContent('by')
    expect(person).toHaveTextContent('Line Manager')
    expect(avatar.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/manager.png',
    )
  })

  it('shows the skip-level manager while final late approval is pending', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cascadeFrom={{
          managerName: 'Line Manager',
          managerAvatarUrl: 'https://cdn.example.com/manager.png',
          skipLevelManagerName: 'Skip Level',
          skipLevelManagerAvatarUrl: 'https://cdn.example.com/skip.png',
          options: [],
        }}
        cycleLabel="Q3 2026"
        status="submitted"
        postWindowApprovalStage="manager_manager"
        commentAuthorName="Manager"
        onChange={vi.fn()}
      />,
    )

    showTab('Details')
    expect(screen.getByRole('img', { name: 'Approver Skip Level' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Approver Line Manager' })).toBeNull()
    expect(screen.getAllByText('Pending final approval').length).toBeGreaterThan(0)
  })

  it('shows the send-back note on the sent-back approval card', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cascadeFrom={{
          managerName: 'Line Manager',
          options: [],
        }}
        cycleLabel="Q3 2026"
        status="sent_back"
        sendBackReason="Please tighten measurement targets."
        commentAuthorName="Manager"
        onChange={vi.fn()}
      />,
    )

    showTab('Details')
    const card = document.querySelector('.pd-goal-view__approval')
    expect(card).toHaveTextContent('Sent back')
    expect(card).toHaveTextContent('Please tighten measurement targets.')
  })

  it('lets the owner add cascading from after the goal is created', () => {
    const onChange = vi.fn()
    const onSave = vi.fn()
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cascadeFrom={{
          managerName: 'Line Manager',
          options: [
            {
              id: 'mgr-1',
              title: 'Raise quality bar',
              managerName: 'Line Manager',
            },
          ],
        }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={onChange}
        onSave={onSave}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Add cascading from' }),
    ).toBeNull()
    startEditing()
    showTab('Details')
    fireEvent.click(screen.getByRole('button', { name: 'Add cascading from' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascading from' }))
    fireEvent.click(screen.getByRole('option', { name: /Raise quality bar/ }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toMatchObject({
      cascadedFromGoalId: 'mgr-1',
      linkedGoalLabel: 'Raise quality bar',
    })
  })

  it('shows the cascading goal from the line manager', () => {
    render(
      <GoalDetailView
        goal={{
          ...goal,
          cascadedFromGoalId: 'mgr-1',
          linkedGoalLabel: 'Raise quality bar',
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cascadeFrom={{
          managerName: 'Line Manager',
          options: [
            {
              id: 'mgr-1',
              title: 'Raise quality bar',
              managerName: 'Line Manager',
            },
          ],
        }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
      />,
    )

    showTab('Details')
    const from = screen.getByLabelText('Cascading from')
    expect(from).toHaveTextContent('Raise quality bar')
    expect(from).toHaveTextContent('Line Manager')
    expect(screen.getByRole('img', { name: 'Line Manager' })).toBeInTheDocument()
  })

  it('shows who this goal was cascaded to', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Line Manager' }}
        cascadedTo={[
          {
            goalId: 'c1',
            goalTitle: 'Raise quality bar',
            personId: 'r1',
            personName: 'Direct Report',
          },
          {
            goalId: 'c2',
            goalTitle: 'Cut defects',
            personId: 'r2',
            personName: 'Second Report',
          },
        ]}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Line Manager"
        onChange={vi.fn()}
      />,
    )

    showTab('Details')
    const to = screen.getByLabelText('Cascaded to')
    expect(to).toHaveTextContent('Raise quality bar')
    expect(to).toHaveTextContent('Direct Report')
    expect(to).toHaveTextContent('Cut defects')
    expect(to).toHaveTextContent('Second Report')
    expect(screen.getByRole('img', { name: 'Direct Report' })).toBeInTheDocument()
  })

  it('makes cascaded goal names open the other person’s goal', () => {
    render(
      <MemoryRouter>
        <GoalDetailView
          goal={goal}
          index={0}
          owner={{ name: 'Line Manager' }}
          cascadedTo={[
            {
              goalId: 'c1',
              goalTitle: 'Cut defects',
              personId: 'r1',
              personName: 'Direct Report',
            },
          ]}
          cascadeHref={(personId, goalId) => `/goals/q3/${personId}/${goalId}`}
          cycleLabel="Q3 2026"
          status="draft"
          commentAuthorName="Line Manager"
          onChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    showTab('Details')
    expect(
      screen.getByRole('link', { name: 'Cut defects · Direct Report' }),
    ).toHaveAttribute('href', '/goals/q3/r1/c1')
  })

  it('shows the comment author’s photo when it is known', () => {
    render(
      <GoalDetailView
        goal={{
          ...goal,
          comments: [
            {
              id: 'c1',
              authorId: '2',
              authorName: 'Line Manager',
              text: 'Looks good',
              createdAt: '2026-08-01T00:00:00.000Z',
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        commentAuthors={[
          {
            id: '2',
            name: 'Line Manager',
            avatarUrl: 'https://cdn.example.com/manager.png',
          },
        ]}
        onChange={vi.fn()}
      />,
    )

    showTab(/Discuss/)
    const avatar = screen.getByRole('img', { name: 'Line Manager' })
    expect(avatar.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/manager.png',
    )
  })

  it('asks which reports should receive a cascaded copy', () => {
    const onCascade = vi.fn()
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Line Manager' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Line Manager"
        canCascade
        cascadeTargets={[
          { id: '1', name: 'Direct Report', title: 'Executive' },
          { id: '3', name: 'Second Report', title: 'Executive' },
        ]}
        onCascade={onCascade}
        onChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cascade this goal' }))

    expect(
      screen.getByRole('dialog', { name: 'Cascade this goal' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Direct Report/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascade' }))

    expect(onCascade).toHaveBeenCalledWith(['1'])
  })

  it('opens one edit session for the title and returns to view after save', () => {
    const onSave = vi.fn()
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={vi.fn()}
        onSave={onSave}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /Improve delivery quality/ }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Goal name')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'More actions' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Save Changes' }),
    ).not.toBeInTheDocument()

    startEditing()
    const nameField = screen.getByLabelText('Goal name')
    fireEvent.change(nameField, { target: { value: 'Raise the quality bar' } })
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Raise the quality bar' }),
    )
    expect(screen.queryByLabelText('Goal name')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Raise the quality bar/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit goal' })).toBeInTheDocument()
  })

  it('keeps structural edits local until the save icon is used', () => {
    const onChange = vi.fn()
    const onSave = vi.fn()
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        manualSave
        hasUnsavedChanges
        onChange={onChange}
        onSave={onSave}
      />,
    )

    startEditing()
    fireEvent.change(screen.getByLabelText('Goal name'), {
      target: { value: 'Raise the quality bar' },
    })

    expect(onChange).not.toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Raise the quality bar' }),
    )
    expect(onChange).not.toHaveBeenCalled()
  })

  it('edits the description in the edit session', () => {
    const onSave = vi.fn()
    render(
      <GoalDetailView
        goal={{ ...goal, details: 'Ship fewer defects' }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={vi.fn()}
        onSave={onSave}
      />,
    )

    showTab('Details')
    expect(
      screen.queryByPlaceholderText('Add a description (optional)'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Ship fewer defects')).toBeInTheDocument()

    startEditing()
    const field = screen.getByPlaceholderText('Add a description (optional)')
    fireEvent.change(field, { target: { value: 'Cut escaped defects' } })
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ details: 'Cut escaped defects' }),
    )
    expect(
      screen.queryByPlaceholderText('Add a description (optional)'),
    ).not.toBeInTheDocument()
  })

  it('shows the table metric tooltip on hover', async () => {
    render(
      <GoalDetailView
        goal={{
          ...goal,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              weight: 100,
              unit: 'number',
              direction: 'increase',
              startValue: 0,
              currentValue: 2,
              targetValue: 6,
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
      />,
    )

    fireEvent.mouseEnter(
      screen.getByLabelText('Current 2 of target 6').closest('.pd-tooltip')!,
    )
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Increase metric')
    expect(tip).toHaveTextContent('Initial value')
    expect(tip).toHaveTextContent('0')
    expect(tip).toHaveTextContent('Current value')
    expect(tip).toHaveTextContent('2')
    expect(tip).toHaveTextContent('Target value')
    expect(tip).toHaveTextContent('6')
    expect(tip).toHaveTextContent('Number')
  })

  it('shows timestamped progress updates and logs a new current value', () => {
    const onChange = vi.fn()
    render(
      <GoalDetailView
        goal={{
          ...goal,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              weight: 100,
              unit: 'number',
              direction: 'increase',
              startValue: 0,
              currentValue: 2,
              targetValue: 6,
              progressLog: [
                {
                  id: 'log-1',
                  recordedAt: '2026-08-10T09:15:00.000Z',
                  authorName: 'Aminul',
                  from: 0,
                  to: 2,
                },
              ],
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        commentAuthorId="1"
        canUpdateProgress
        onChange={onChange}
      />,
    )

    const updates = screen.getByLabelText('Progress logs')
    expect(updates).not.toHaveAttribute('open')
    expect(updates).toHaveTextContent('Log')
    expect(updates.querySelector('.pd-count-badge')).toHaveTextContent('1')
    expect(updates.querySelector('.pd-count-badge')).toHaveClass(
      'pd-count-badge--muted',
    )
    fireEvent.click(screen.getByText('Log'))
    expect(updates).toHaveAttribute('open')
    expect(updates).toHaveTextContent('0 → 2')
    expect(updates).not.toHaveTextContent('Aminul')
    expect(updates.querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-08-10T09:15:00.000Z',
    )

    const field = screen.getByLabelText('Current progress for NPS')
    expect(screen.getByText(/Last value:/)).toHaveTextContent('0 → 2 → 6')
    expect(screen.getByText(/Last value:/)).toHaveTextContent('Q3 2026')
    fireEvent.change(field, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add update for NPS' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].measurements[0]).toMatchObject({
      currentValue: 5,
      progressLog: [
        expect.objectContaining({ to: 2 }),
        expect.objectContaining({
          authorId: '1',
          authorName: 'Aminul',
          from: 2,
          to: 5,
        }),
      ],
    })
  })

  it('shows the measurement editor after entering the edit session', () => {
    render(
      <GoalDetailView
        goal={{
          ...goal,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              weight: 100,
              unit: 'number',
              direction: 'increase',
              targetValue: 50,
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.queryByText('Metrics')).not.toBeInTheDocument()
    expect(
      screen.getByLabelText('Current progress for NPS'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit how to measure progress' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit metric name' }),
    ).not.toBeInTheDocument()

    startEditing()
    expect(screen.getByText('Metrics')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit metric name' }))
    expect(screen.getByLabelText('Metric name')).toHaveValue('NPS')
    expect(screen.getByText('Log update')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Current progress for NPS'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Save Changes' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the edit-view measurement order in read view', () => {
    render(
      <GoalDetailView
        goal={{
          ...goal,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              weight: 60,
              unit: 'number',
              direction: 'increase',
              targetValue: 50,
            },
            {
              id: 't1',
              kind: 'milestone',
              measureTitle: 'Milestones',
              title: 'Write the readout',
              weight: 40,
              complete: false,
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
      />,
    )

    const nps = screen.getByLabelText('NPS')
    const milestones = screen.getByLabelText('Milestones')
    expect(
      nps.compareDocumentPosition(milestones) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(nps).toContainElement(screen.getByRole('img', { name: 'Metric' }))
    expect(milestones).toContainElement(
      screen.getByRole('img', { name: 'Milestone' }),
    )
  })

  it('hides the task list name in view when there is only one list', () => {
    render(
      <GoalDetailView
        goal={{
          ...goal,
          measurements: [
            {
              id: 't1',
              kind: 'milestone',
              measureTitle: 'Prepare Product Requirement Doc',
              listId: 'l1',
              listTitle: 'Task List 1',
              title: 'Task Item 001',
              weight: 100,
              complete: false,
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
      />,
    )

    expect(screen.queryByText('Task List 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Task List')).not.toBeInTheDocument()
    expect(screen.getByText('Task Item 001')).toBeInTheDocument()
  })

  it('keeps one Edit button and leaves progress logging on view', () => {
    const onChange = vi.fn()
    render(
      <GoalDetailView
        goal={{
          ...goal,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              weight: 100,
              unit: 'number',
              direction: 'increase',
              startValue: 0,
              currentValue: 2,
              targetValue: 6,
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        commentAuthorId="1"
        canEdit
        onChange={onChange}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('button', { name: /^Edit/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Edit goal' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit how to measure progress' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit cascading from' }),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Current progress for NPS'), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add update for NPS' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].measurements[0]).toMatchObject({
      currentValue: 5,
    })
    expect(screen.queryByLabelText('Goal name')).not.toBeInTheDocument()
  })

  it('uses the same form for a new goal without discuss or approval chrome', () => {
    const onSave = vi.fn()
    render(
      <GoalDetailView
        isNew
        canEdit
        manualSave
        hasUnsavedChanges
        goal={{
          id: 'goal-new',
          description: 'Ship the draft',
          weight: 0,
          measurements: [],
        }}
        index={0}
        owner={{ name: 'Aminul' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
        onSave={onSave}
      />,
    )

    expect(screen.getByLabelText('Add goal')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Name this goal')).toHaveValue(
      'Ship the draft',
    )
    expect(screen.queryByRole('button', { name: /Discuss/ })).toBeNull()
    expect(screen.queryByText('Pending approval')).toBeNull()
    expect(screen.queryByText('Waiting on manager')).toBeNull()

    const save = screen.getByRole('button', { name: 'Save as draft' })
    expect(save).toBeEnabled()
    expect(save).not.toHaveTextContent('Add Goal')
    fireEvent.click(save)
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('disables save on a new goal when there is nothing to persist', () => {
    render(
      <GoalDetailView
        isNew
        canEdit
        manualSave
        goal={{
          id: 'goal-new',
          description: 'Ship the draft',
          weight: 0,
          measurements: [],
        }}
        index={0}
        owner={{ name: 'Aminul' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeDisabled()
  })

  it('keeps add cascading from on details for a new goal', () => {
    render(
      <GoalDetailView
        isNew
        canEdit
        manualSave
        goal={{
          id: 'goal-new',
          description: 'Ship the draft',
          weight: 0,
          measurements: [],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cascadeFrom={{
          managerName: 'Line Manager',
          options: [],
        }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Owner Aminul Islam Borhan')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Add cascading from' }),
    ).toBeNull()
    showTab('Details')
    expect(
      screen.getByRole('button', { name: 'Add cascading from' }),
    ).toBeInTheDocument()
  })

  it('highlights the measure card that opened the window', () => {
    render(
      <GoalDetailView
        goal={{
          ...goal,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              weight: 50,
              unit: 'number',
              direction: 'increase',
              startValue: 0,
              currentValue: 2,
              targetValue: 6,
            },
            {
              id: 'm2',
              kind: 'metric',
              title: 'Defects closed',
              weight: 50,
              unit: 'number',
              direction: 'increase',
              startValue: 0,
              currentValue: 1,
              targetValue: 10,
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        highlightMeasureKey="m1"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('NPS')).toHaveClass('is-highlighted')
    expect(screen.getByLabelText('Defects closed')).not.toHaveClass(
      'is-highlighted',
    )
  })
})
