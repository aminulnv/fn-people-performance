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
  goalType: 'outcome',
  processType: 'bau',
  priority: 'medium',
  measurements: [],
}

describe('GoalDetailView', () => {
  it('shows submission status without per-goal approve actions', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="submitted"
        commentAuthorName="Manager"
        onChange={vi.fn()}
        onSelectIndex={vi.fn()}
      />,
    )

    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(screen.getByText('Waiting on manager')).toBeInTheDocument()
    const ownerRow = screen.getByLabelText('Owner Aminul Islam Borhan')
    const approval = screen.getByText('Pending approval').closest('.pd-goal-view__approval')
    expect(ownerRow.closest('.pd-goal-view__byline')?.nextElementSibling).toBe(
      approval,
    )
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Send Back' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Goal classification')).toHaveTextContent(
      'Outcome',
    )
    expect(screen.getByLabelText('Goal classification')).toHaveTextContent('BAU')
    expect(screen.getByLabelText('Goal classification')).toHaveTextContent(
      'Medium',
    )
  })

  it('shows the manager avatar on the pending approval card', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
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
        onSelectIndex={vi.fn()}
      />,
    )

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
        total={1}
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
        onSelectIndex={vi.fn()}
      />,
    )

    expect(screen.getByRole('img', { name: 'Approver Skip Level' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Approver Line Manager' })).toBeNull()
    expect(screen.getByText('Pending final approval')).toBeInTheDocument()
  })

  it('shows the send-back note on the sent-back approval card', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
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
        onSelectIndex={vi.fn()}
      />,
    )

    const card = screen.getByText('Sent back').closest('.pd-goal-view__approval')
    expect(card).toHaveTextContent('Please tighten measurement targets.')
  })

  it('keeps classification read-only until the edit icon is clicked', () => {
    const onSave = vi.fn()
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={vi.fn()}
        onSave={onSave}
        onSelectIndex={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Goal type' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Edit goal type' }))
    expect(screen.getByRole('button', { name: 'Goal type' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Goal type' }))
    fireEvent.click(screen.getByRole('option', { name: 'Output' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({ goalType: 'output' })
  })

  it('lets the owner add cascading from after the goal is created', () => {
    const onSave = vi.fn()
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
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
        onChange={vi.fn()}
        onSave={onSave}
        onSelectIndex={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add cascading from' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascading from' }))
    fireEvent.click(screen.getByRole('option', { name: /Raise quality bar/ }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({
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
        total={1}
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
        onSelectIndex={vi.fn()}
      />,
    )

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
        total={1}
        owner={{ name: 'Line Manager' }}
        cascadedTo={[
          {
            goalId: 'c1',
            goalTitle: 'Untitled Cascading Goal from Line Manager',
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
        onSelectIndex={vi.fn()}
      />,
    )

    const to = screen.getByLabelText('Cascaded to')
    expect(to).toHaveTextContent('Untitled Cascading Goal from Line Manager')
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
          total={1}
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
          onSelectIndex={vi.fn()}
        />
      </MemoryRouter>,
    )

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
        total={1}
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
        onSelectIndex={vi.fn()}
      />,
    )

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
        total={1}
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
        onSelectIndex={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cascade This Goal' }))

    expect(
      screen.getByRole('dialog', { name: 'Cascade this goal' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Direct Report/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascade' }))

    expect(onCascade).toHaveBeenCalledWith(['1'])
  })

  it('edits the title in place without opening a full edit form', () => {
    const onSave = vi.fn()
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={vi.fn()}
        onSave={onSave}
        onSelectIndex={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'More actions' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit title' }))

    const nameField = screen.getByLabelText('Goal name')
    expect(nameField).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Save Changes' }),
    ).not.toBeInTheDocument()

    fireEvent.change(nameField, { target: { value: 'Raise the quality bar' } })
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Raise the quality bar' }),
    )
  })

  it('edits the description in place', () => {
    const onSave = vi.fn()
    render(
      <GoalDetailView
        goal={{ ...goal, details: 'Ship fewer defects' }}
        index={0}
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={vi.fn()}
        onSave={onSave}
        onSelectIndex={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit description' }))
    const field = screen.getByPlaceholderText('Add a description (optional)')
    fireEvent.change(field, { target: { value: 'Cut escaped defects' } })
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ details: 'Cut escaped defects' }),
    )
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
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
        onSelectIndex={vi.fn()}
      />,
    )

    fireEvent.mouseEnter(
      screen.getByLabelText('Start 0, current 2, target 6').closest('.pd-tooltip')!,
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
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        commentAuthorId="1"
        canUpdateProgress
        onChange={onChange}
        onSelectIndex={vi.fn()}
      />,
    )

    const updates = screen.getByLabelText('Progress updates')
    expect(updates).not.toHaveAttribute('open')
    expect(updates).toHaveTextContent('1 update')
    fireEvent.click(screen.getByText('Updates'))
    expect(updates).toHaveAttribute('open')
    expect(updates).toHaveTextContent('0 → 2')
    expect(updates).not.toHaveTextContent('Aminul')
    expect(updates.querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-08-10T09:15:00.000Z',
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Log update for NPS' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Update progress' })
    expect(dialog).toHaveTextContent('Last value: 0 → 2 → 6')
    expect(dialog).toHaveTextContent('Q3 2026')
    const field = screen.getByLabelText('Current progress for NPS')
    fireEvent.change(field, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update values' }))

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

  it('opens the measurement editor on the same page', () => {
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
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={vi.fn()}
        onSave={vi.fn()}
        onSelectIndex={vi.fn()}
      />,
    )

    const metric = screen.getByLabelText('NPS')
    expect(screen.getByLabelText('Values for NPS')).toHaveTextContent(
      '— → — → 50',
    )
    expect(metric).toHaveTextContent('Weight')
    expect(metric).toHaveTextContent('100%')

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit how to measure progress' }),
    )

    expect(screen.getByText('How to measure progress?')).toBeInTheDocument()
    expect(screen.getByLabelText('Metric name')).toHaveValue('NPS')
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
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
              title: 'Write the readout',
              weight: 40,
              complete: false,
            },
          ],
        }}
        index={0}
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
        onSelectIndex={vi.fn()}
      />,
    )

    const nps = screen.getByLabelText('NPS')
    const todos = screen.getByLabelText('To dos')
    expect(
      nps.compareDocumentPosition(todos) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
