import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

afterEach(cleanup)

const goal: Goal = {
  id: 'goal-1',
  description: 'Improve delivery quality',
  weight: 100,
  measurements: [],
}

function renderView(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function openGoalActions() {
  fireEvent.mouseEnter(
    screen.getByRole('button', { name: 'Goal actions' }).closest('.pd-menu')!,
  )
}

function startEditing() {
  openGoalActions()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
}

function blurField(label: string) {
  fireEvent.blur(screen.getByLabelText(label))
}

describe('GoalDetailView', () => {
  it('shows submission status without per-goal approve actions', () => {
    renderView(
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

    expect(screen.getAllByText('Pending approval').length).toBeGreaterThan(0)
    expect(screen.queryByText('Waiting on manager')).not.toBeInTheDocument()
    expect(document.querySelector('.pd-goal-view__approval')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Send Back' }),
    ).not.toBeInTheDocument()
  })

  it('shows description and measures in one view without Details or Measure tabs', () => {
    renderView(
      <GoalDetailView
        goal={{
          ...goal,
          details: 'Ship fewer defects',
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

    expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Measure' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Goal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Discuss/ })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: 'Goal sections' }),
    ).not.toBeInTheDocument()
    const owner = screen.getByText('Aminul Islam Borhan')
    const comments = screen.getByRole('region', { name: 'Comments' })
    expect(
      owner.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByLabelText('Add Comment')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.queryByText('No description')).not.toBeInTheDocument()
    const description = screen.getByText('Ship fewer defects')
    expect(description.closest('details')).not.toHaveAttribute('open')
    fireEvent.click(screen.getByText('Description'))
    expect(description.closest('details')).toHaveAttribute('open')
    expect(screen.getByLabelText('NPS')).toBeInTheDocument()
    expect(
      screen.getByLabelText('NPS').compareDocumentPosition(comments) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      screen.getByText('Q3 2026').closest('.pd-goal-view__window-title'),
    ).toBeTruthy()
    expect(
      screen.getByText('No updates yet').closest('.pd-goal-view__window-title'),
    ).toBeTruthy()
    expect(screen.queryByText('Current', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByText('Not submitted yet')).not.toBeInTheDocument()
    expect(document.querySelector('.pd-goal-view__approval')).toBeNull()
  })

  it('shows a description placeholder when none is saved', () => {
    renderView(
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

    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('No description')).toHaveClass('is-empty')
  })

  it('keeps goal weight beside the owner name', () => {
    renderView(
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
    expect(byline).toHaveTextContent('Goal Weight %')
    expect(byline).toHaveTextContent('100')
    expect(byline).not.toHaveTextContent('100%')
    expect(byline).not.toHaveTextContent('Q3 2026')
    expect(byline).not.toHaveTextContent('No updates yet')
    expect(byline).not.toHaveTextContent('Draft')
    expect(
      screen.getByText('Q3 2026').closest('.pd-goal-view__window-title'),
    ).toHaveTextContent('Goal')
    expect(
      screen.getByText('No updates yet').closest('.pd-goal-view__window-meta'),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Improve delivery quality' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Draft').closest('.pd-goal-view__window-title'),
    ).toHaveTextContent('Goal')
    expect(document.querySelector('.pd-goal-view__approval')).toBeNull()
    expect(screen.queryByText('Not submitted yet')).not.toBeInTheDocument()
  })

  it('keeps late-approval status on the chip without an approval banner', () => {
    renderView(
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

    expect(screen.getAllByText('Pending final approval').length).toBeGreaterThan(0)
    expect(document.querySelector('.pd-goal-view__approval')).toBeNull()
    expect(screen.queryByRole('img', { name: 'Approver Skip Level' })).toBeNull()
  })

  it('keeps sent-back status on the chip without an approval banner', () => {
    renderView(
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
        commentAuthorName="Manager"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Sent back')).toBeInTheDocument()
    expect(document.querySelector('.pd-goal-view__approval')).toBeNull()
  })

  it('lets the owner add cascading from after the goal is created', () => {
    const onChange = vi.fn()
    const onSave = vi.fn()
    renderView(
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
      screen.queryByRole('button', { name: 'Add Cascading From' }),
    ).toBeNull()
    startEditing()
    fireEvent.click(screen.getByRole('button', { name: 'Add Cascading From' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascading from' }))
    fireEvent.click(screen.getByRole('option', { name: /Raise quality bar/ }))

    expect(onChange).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({
      cascadedFromGoalId: 'mgr-1',
      linkedGoalLabel: 'Raise quality bar',
    })
  })

  it('shows the cascading goal from the line manager', () => {
    renderView(
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

    const from = screen.getByRole('region', { name: 'Cascading from' })
    expect(from).toHaveTextContent('Raise quality bar')
    expect(from).not.toHaveTextContent('Line Manager')
    expect(from).toHaveTextContent('Cascading from')
    expect(screen.queryByRole('img', { name: 'Cascading from' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Line Manager' })).not.toBeInTheDocument()
    expect(
      from.compareDocumentPosition(screen.getByRole('heading', { name: goal.description })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('shows the cascading owner and metrics in a tooltip', async () => {
    renderView(
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
          managerAvatarUrl: 'https://cdn.example.com/manager.png',
          options: [
            {
              id: 'mgr-1',
              title: 'Raise quality bar',
              managerName: 'Line Manager',
              managerAvatarUrl: 'https://cdn.example.com/manager.png',
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
            },
          ],
        }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
      />,
    )

    fireEvent.mouseEnter(screen.getByText('Raise quality bar').closest('.pd-tooltip')!)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Raise quality bar')
    expect(tip).toHaveTextContent('Line Manager')
    expect(tip).not.toHaveTextContent('NPS')
    expect(screen.getByRole('img', { name: 'Line Manager' })).toBeInTheDocument()
  })

  it('lets the owner link an existing report goal as cascaded to', () => {
    const onLinkCascadeTo = vi.fn()
    renderView(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Line Manager' }}
        cascadeToOptions={[
          {
            id: 'r-goal-1',
            title: 'Cut defects',
            personId: 'r1',
            personName: 'Direct Report',
          },
        ]}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Line Manager"
        canEdit
        onChange={vi.fn()}
        onSave={vi.fn()}
        onLinkCascadeTo={onLinkCascadeTo}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Add Cascading To' }),
    ).toBeNull()
    startEditing()
    fireEvent.click(screen.getByRole('button', { name: 'Add Cascading To' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascaded to' }))
    expect(
      screen.queryByRole('option', { name: /Create New Cascading Goal/ }),
    ).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: /Cut defects/ }))

    expect(onLinkCascadeTo).toHaveBeenCalledTimes(1)
    expect(onLinkCascadeTo).toHaveBeenCalledWith({
      id: 'r-goal-1',
      title: 'Cut defects',
      personId: 'r1',
      personName: 'Direct Report',
    })
  })

  it('lets the owner create a new cascaded goal from the same dropdown', () => {
    const onCascade = vi.fn()
    const onLinkCascadeTo = vi.fn()
    renderView(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Line Manager' }}
        cascadeToOptions={[
          {
            id: 'r-goal-1',
            title: 'Cut defects',
            personId: 'r1',
            personName: 'Direct Report',
          },
        ]}
        cascadeTargets={[
          { id: '1', name: 'Direct Report', title: 'Executive' },
          { id: '3', name: 'Second Report', title: 'Executive' },
        ]}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Line Manager"
        canEdit
        onChange={vi.fn()}
        onSave={vi.fn()}
        onLinkCascadeTo={onLinkCascadeTo}
        onCascade={onCascade}
      />,
    )

    startEditing()
    fireEvent.click(screen.getByRole('button', { name: 'Add Cascading To' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascaded to' }))
    fireEvent.click(
      screen.getByRole('option', { name: /Create New Cascading Goal/ }),
    )

    expect(
      screen.getByRole('dialog', { name: 'Cascade This Goal' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Second Report/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascade' }))

    expect(onLinkCascadeTo).not.toHaveBeenCalled()
    expect(onCascade).toHaveBeenCalledTimes(1)
    expect(onCascade).toHaveBeenCalledWith(['3'])
  })

  it('offers create when reports have no existing goal to link', () => {
    renderView(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Line Manager' }}
        cascadeTargets={[{ id: '1', name: 'Direct Report', title: 'Executive' }]}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Line Manager"
        canEdit
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCascade={vi.fn()}
      />,
    )

    startEditing()
    fireEvent.click(screen.getByRole('button', { name: 'Add Cascading To' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascaded to' }))
    expect(
      screen.getByRole('option', { name: /Create New Cascading Goal/ }),
    ).toBeInTheDocument()
  })

  it('lets the owner unlink a cascaded report goal', () => {
    const onUnlinkCascadeTo = vi.fn()
    renderView(
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
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Line Manager"
        canEdit
        onChange={vi.fn()}
        onSave={vi.fn()}
        onLinkCascadeTo={vi.fn()}
        onUnlinkCascadeTo={onUnlinkCascadeTo}
      />,
    )

    startEditing()
    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }))

    expect(onUnlinkCascadeTo).toHaveBeenCalledTimes(1)
    expect(onUnlinkCascadeTo).toHaveBeenCalledWith({
      goalId: 'c1',
      goalTitle: 'Cut defects',
      personId: 'r1',
      personName: 'Direct Report',
    })
  })

  it('shows who this goal was cascaded to', async () => {
    renderView(
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
            measurements: [
              {
                id: 'm1',
                kind: 'metric',
                title: 'Quality',
                weight: 100,
                unit: 'number',
                direction: 'increase',
                startValue: 1,
                currentValue: 3,
                targetValue: 5,
              },
            ],
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

    const to = screen.getByRole('region', { name: 'Cascaded to' })
    expect(to).toHaveTextContent('Cascaded to')
    expect(screen.queryByRole('img', { name: 'Cascaded to' })).not.toBeInTheDocument()
    expect(to).toHaveTextContent('Raise quality bar')
    expect(to).not.toHaveTextContent('Direct Report')
    expect(to).toHaveTextContent('Cut defects')
    expect(to).not.toHaveTextContent('Second Report')
    expect(screen.queryByRole('img', { name: 'Direct Report' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: goal.description }).compareDocumentPosition(to) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    fireEvent.mouseEnter(screen.getByText('Raise quality bar').closest('.pd-tooltip')!)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Raise quality bar')
    expect(tip).toHaveTextContent('Direct Report')
    expect(tip).not.toHaveTextContent('Quality')
  })

  it('makes cascaded goal names open the other person’s goal', () => {
    renderView(
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
      />,
    )

    expect(
      screen.getByRole('link', { name: 'Cut defects · Direct Report' }),
    ).toHaveAttribute('href', '/goals/q3/r1/c1')
  })

  it('shows the comment author’s photo when it is known', () => {
    renderView(
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

    const avatar = screen.getByRole('img', { name: 'Line Manager' })
    expect(avatar.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/manager.png',
    )
  })

  function ownComment() {
    return {
      ...goal,
      comments: [
        {
          id: 'c1',
          authorId: '1',
          authorName: 'Aminul',
          text: 'Looks good',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
        {
          id: 'c2',
          authorId: '2',
          authorName: 'Line Manager',
          text: 'Please add a metric',
          createdAt: '2026-08-02T00:00:00.000Z',
        },
      ],
    }
  }

  function openCommentActions() {
    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'Comment actions' }).closest('.pd-menu')!,
    )
  }

  it('lets the author edit and delete their own comment', () => {
    const onUpdateComment = vi.fn()
    const onRemoveComment = vi.fn()
    renderView(
      <GoalDetailView
        goal={ownComment()}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        commentAuthorId="1"
        canUpdateProgress
        onChange={vi.fn()}
        onUpdateComment={onUpdateComment}
        onRemoveComment={onRemoveComment}
      />,
    )

    expect(screen.getByText('Looks good')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Comment actions' })).toHaveLength(1)

    openCommentActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const editor = screen.getByLabelText('Edit Comment')
    fireEvent.change(editor, { target: { value: 'Updated note' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onUpdateComment).toHaveBeenCalledWith('c1', 'Updated note')

    openCommentActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Comment' }))
    expect(onRemoveComment).toHaveBeenCalledWith('c1')
  })

  it('does not offer comment actions on someone else’s note', () => {
    renderView(
      <GoalDetailView
        goal={ownComment()}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        commentAuthorId="1"
        canUpdateProgress
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Please add a metric')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Comment actions' })).toHaveLength(1)
  })

  it('hides comment actions when the viewer cannot mutate the goal', () => {
    renderView(
      <GoalDetailView
        goal={ownComment()}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="approved"
        commentAuthorName="Aminul"
        commentAuthorId="1"
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Comment actions' }),
    ).not.toBeInTheDocument()
  })

  it('links tagged people inside a comment', () => {
    renderView(
      <GoalDetailView
        goal={{
          ...goal,
          comments: [
            {
              id: 'c1',
              authorId: '1',
              authorName: 'Aminul',
              text: 'Hey @[Line Manager](2), please review',
              createdAt: '2026-08-01T00:00:00.000Z',
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        commentAuthors={[{ id: '2', name: 'Line Manager' }]}
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('link', { name: '@Line Manager' }),
    ).toHaveAttribute('href', '/people/2')
  })

  it('lets a commenter tag someone from the @ list', () => {
    const onAddComment = vi.fn()
    renderView(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        commentAuthorId="1"
        commentAuthors={[
          { id: '2', name: 'Line Manager', title: 'Manager' },
          { id: '3', name: 'HR Partner' },
        ]}
        canUpdateProgress
        onChange={vi.fn()}
        onAddComment={onAddComment}
      />,
    )

    const field = screen.getByLabelText('Add Comment')
    fireEvent.change(field, { target: { value: '@Lin' } })
    expect(screen.getByRole('option', { name: /Line Manager/ })).toBeInTheDocument()
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(field).toHaveValue('@[Line Manager](2) ')
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onAddComment).toHaveBeenCalledWith('@[Line Manager](2)')
  })

  it('does not keep a toolbar cascade action once create lives in cascading to', () => {
    renderView(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Line Manager' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Line Manager"
        canEdit
        cascadeTargets={[
          { id: '1', name: 'Direct Report', title: 'Executive' },
        ]}
        onCascade={vi.fn()}
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Cascade This Goal' }),
    ).not.toBeInTheDocument()
  })

  it('opens one edit session for the title and returns to view after save', () => {
    const onSave = vi.fn()
    renderView(
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
    const actions = screen.getByRole('button', { name: 'Goal actions' })
    const status = screen.getByText('Draft')
    expect(status.closest('.pd-goal-view__window-meta')).toContainElement(actions)
    expect(
      status.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Save Changes' }),
    ).not.toBeInTheDocument()

    startEditing()
    const nameField = screen.getByLabelText('Goal name')
    fireEvent.change(nameField, { target: { value: 'Raise the quality bar' } })
    expect(onSave).not.toHaveBeenCalled()

    blurField('Goal name')
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Raise the quality bar' }),
    )
    expect(screen.getByLabelText('Goal name')).toBeInTheDocument()
    openGoalActions()
    expect(screen.queryByRole('menuitem', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Cancel' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancel' }))
    expect(screen.queryByLabelText('Goal name')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Improve delivery quality/ }),
    ).toBeInTheDocument()
    openGoalActions()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
  })

  it('persists the title when the field loses focus', () => {
    const onChange = vi.fn()
    const onSave = vi.fn()
    renderView(
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

    blurField('Goal name')
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Raise the quality bar' }),
    )
    expect(onChange).not.toHaveBeenCalled()
  })

  it('offers to add milestones or a number when the goal has none', () => {
    const onChange = vi.fn()
    const onSave = vi.fn()
    renderView(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={onChange}
        onSave={onSave}
      />,
    )

    expect(screen.getByRole('heading', { name: 'No Metrics Yet' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Add a number or a milestone so progress on this goal can be tracked.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add Number' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add Milestones' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        measurements: expect.arrayContaining([
          expect.objectContaining({ kind: 'milestone' }),
        ]),
      }),
    )
    openGoalActions()
    expect(screen.queryByRole('menuitem', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('adds a number measure from the empty state', () => {
    const onChange = vi.fn()
    const onSave = vi.fn()
    renderView(
      <GoalDetailView
        goal={goal}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        canEdit
        onChange={onChange}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Number' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        measurements: [
          expect.objectContaining({ kind: 'metric', unit: 'number' }),
        ],
      }),
    )
    openGoalActions()
    expect(screen.queryByRole('menuitem', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('edits the description in the edit session', () => {
    const onSave = vi.fn()
    renderView(
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

    expect(
      screen.queryByPlaceholderText('Add a description (optional)'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Ship fewer defects')).toBeInTheDocument()

    startEditing()
    const field = screen.getByLabelText('Description')
    fireEvent.change(field, { target: { value: 'Cut escaped defects' } })
    expect(onSave).not.toHaveBeenCalled()

    blurField('Description')
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ details: 'Cut escaped defects' }),
    )
    expect(
      screen.getByPlaceholderText('Add a description (optional)'),
    ).toBeInTheDocument()
  })

  it('shows the table metric tooltip on hover', async () => {
    renderView(
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

    fireEvent.mouseEnter(screen.getByRole('heading', { name: 'NPS' }).closest('.pd-tooltip')!)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Increase metric')
    expect(tip).toHaveTextContent('NPS')
    expect(tip).toHaveTextContent('Initial')
    expect(tip).toHaveTextContent('0')
    expect(tip).toHaveTextContent('Current')
    expect(tip).toHaveTextContent('2')
    expect(tip).toHaveTextContent('Target')
    expect(tip).toHaveTextContent('6')
    expect(tip).toHaveTextContent('Number')
    expect(tip).toHaveTextContent('4 to go')
  })

  it('shows timestamped progress updates and logs a new current value', () => {
    const onChange = vi.fn()
    renderView(
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

    const updates = screen.getByLabelText('Progress Updates')
    expect(updates).not.toHaveAttribute('open')
    expect(updates).toHaveTextContent('Progress')
    expect(updates.querySelector('.pd-count-badge')).toHaveTextContent('1')
    expect(updates.querySelector('.pd-count-badge')).toHaveClass(
      'pd-count-badge--muted',
    )
    fireEvent.click(screen.getByText('Progress'))
    expect(updates).toHaveAttribute('open')
    expect(
      screen.getByRole('heading', { name: 'Progress Updates 1 update' }),
    ).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Add Update For NPS' }))

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

  it('shows saved proof on a metric and lets the owner add a link', () => {
    const onChange = vi.fn()
    renderView(
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
              proofUrl: 'https://dash.fn/nps',
              comment: 'Q2 dashboard',
            },
          ],
        }}
        index={0}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="approved"
        commentAuthorName="Aminul"
        canUpdateProgress
        onChange={onChange}
      />,
    )

    const urlButton = screen.getByRole('button', { name: 'Edit proof for NPS' })
    expect(urlButton).not.toHaveTextContent('URL')
    expect(urlButton.closest('.pd-goal-view__fold-meta')).toBeTruthy()
    fireEvent.click(urlButton)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByLabelText('Proof link for NPS')).toHaveValue(
      'https://dash.fn/nps',
    )
    expect(screen.queryByLabelText('Proof note for NPS')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Proof link for NPS'), {
      target: { value: 'https://dash.fn/nps-q3' },
    })
    fireEvent.blur(screen.getByLabelText('Proof link for NPS'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        measurements: [
          expect.objectContaining({
            proofUrl: 'https://dash.fn/nps-q3',
            comment: 'Q2 dashboard',
          }),
        ],
      }),
    )
  })

  it('shows the measurement editor after entering the edit session', () => {
    renderView(
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
    expect(screen.getByText('Progress update')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Current progress for NPS'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Save Changes' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the edit-view measurement order in read view', () => {
    renderView(
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
    expect(
      screen.getByLabelText('Current — of target 50').closest('.pd-goal-view__fold-title'),
    ).toBeTruthy()
    expect(nps.querySelector('h2')).toHaveTextContent('NPS')
    expect(nps.querySelector('h2')).not.toHaveTextContent('60%')
    expect(
      screen.getByLabelText('60 percent').closest('.pd-goal-view__fold-meta'),
    ).toBeTruthy()
  })

  it('hides the task list name in view when there is only one list', () => {
    renderView(
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
    renderView(
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

    expect(screen.getByRole('button', { name: 'Goal actions' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit goal' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit how to measure progress' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit cascading from' }),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Current progress for NPS'), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Update For NPS' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].measurements[0]).toMatchObject({
      currentValue: 5,
    })
    expect(screen.queryByLabelText('Goal name')).not.toBeInTheDocument()
  })

  it('uses the same form for a new goal without discuss or approval chrome', () => {
    const onSave = vi.fn()
    renderView(
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

    expect(screen.getByLabelText('Add Goal')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Name this goal')).toHaveValue(
      'Ship the draft',
    )
    expect(screen.queryByRole('button', { name: /Discuss/ })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Comments' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Details' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Measure' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Goal' })).toBeNull()
    expect(screen.queryByText('Pending approval')).toBeNull()
    expect(screen.queryByText('Waiting on manager')).toBeNull()
    expect(screen.queryByText('Not submitted yet')).toBeNull()
    expect(document.querySelector('.pd-goal-view__approval')).toBeNull()

    fireEvent.blur(screen.getByPlaceholderText('Name this goal'))
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText('Name this goal'), {
      target: { value: 'Ship the launch' },
    })
    fireEvent.blur(screen.getByPlaceholderText('Name this goal'))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Ship the launch' }),
    )
    expect(screen.queryByRole('menuitem', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('does not persist a new goal until it has a name', () => {
    const onSave = vi.fn()
    renderView(
      <GoalDetailView
        isNew
        canEdit
        manualSave
        goal={{
          id: 'goal-new',
          description: '',
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

    fireEvent.blur(screen.getByPlaceholderText('Name this goal'))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('menuitem', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('locks a new goal until it has a name', () => {
    renderView(
      <GoalDetailView
        isNew
        canEdit
        manualSave
        goal={{
          id: 'goal-new',
          description: '',
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

    const nameField = screen.getByPlaceholderText('Name this goal')
    expect(nameField).toHaveValue('')
    expect(nameField).toHaveFocus()
    expect(screen.queryByText('Goal name is required')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Progress metrics' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Number' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add Milestones' })).toBeDisabled()
    expect(screen.getByLabelText('Description')).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Add Cascading From' }),
    ).toBeDisabled()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Add Number' }))
    expect(screen.getByText('Goal name is required')).toBeInTheDocument()
    fireEvent.blur(nameField)
    expect(screen.getByText('Goal name is required')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Save' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Goal name'), {
      target: { value: 'Ship the draft' },
    })

    expect(screen.getByRole('button', { name: 'Add Number' })).toBeEnabled()
    expect(screen.getByLabelText('Description')).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'Add Cascading From' }),
    ).toBeEnabled()
  })

  it('keeps add cascading from on a new goal', () => {
    renderView(
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
        cascadeToOptions={[
          {
            id: 'r-goal-1',
            title: 'Cut defects',
            personId: 'r1',
            personName: 'Direct Report',
          },
        ]}
        onLinkCascadeTo={vi.fn()}
      />,
    )

    const addCascade = screen.getByRole('button', { name: 'Add Cascading From' })
    const title = screen.getByLabelText('Goal name')
    expect(
      addCascade.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Add Cascading To' }),
    ).toBeNull()
  })

  it('fills title, description, and metric when a key result is dropped', () => {
    const onSave = vi.fn()
    renderView(
      <GoalDetailView
        isNew
        canEdit
        manualSave
        goal={{
          id: 'goal-new',
          description: '',
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

    const store: Record<string, string> = {}
    const dataTransfer = {
      dropEffect: 'none',
      effectAllowed: 'copy',
      types: ['application/x-okr-goal-fill'],
      setData(type: string, value: string) {
        store[type] = value
      },
      getData(type: string) {
        return store[type] ?? ''
      },
    } as DataTransfer
    dataTransfer.setData(
      'application/x-okr-goal-fill',
      JSON.stringify({
        title: 'Build Performance Platform Phase 1',
        description: 'Q3 Build, Q4 Testing, Q1 2027 Launch',
        unit: '%',
        currentValue: 20,
        targetValue: 100,
        progressPercent: 20,
      }),
    )

    const form = screen.getByLabelText('Add Goal')
    fireEvent.dragOver(form, { dataTransfer })
    fireEvent.drop(form, { dataTransfer })

    expect(screen.getByPlaceholderText('Name this goal')).toHaveValue(
      'Build Performance Platform Phase 1',
    )
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Q3 Build, Q4 Testing, Q1 2027 Launch',
    )
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Build Performance Platform Phase 1',
        details: 'Q3 Build, Q4 Testing, Q1 2027 Launch',
        measurements: [
          expect.objectContaining({
            kind: 'metric',
            title: 'Build Performance Platform Phase 1',
            unit: '%',
            currentValue: 20,
            targetValue: 100,
          }),
        ],
      }),
    )
  })

  it('highlights the measure card that opened the window', () => {
    renderView(
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
    expect(screen.getByLabelText('NPS')).toHaveAttribute('open')
    expect(screen.queryByLabelText('Defects closed')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'All Metrics' }))

    expect(screen.getByLabelText('NPS')).toHaveClass('is-highlighted')
    expect(screen.getByLabelText('Defects closed')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'All Metrics' }),
    ).not.toBeInTheDocument()

    fireEvent.doubleClick(
      screen.getByRole('heading', { name: 'Defects closed' }),
    )

    expect(screen.queryByLabelText('NPS')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Defects closed')).toHaveClass(
      'is-highlighted',
    )
    expect(screen.getByRole('button', { name: 'All Metrics' })).toBeInTheDocument()
  })
})
