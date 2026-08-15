import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { GoalUnifiedDetail } from './GoalUnifiedDetail'
import type { Goal } from '@/lib/goals/types'

afterEach(() => {
  cleanup()
})

vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui')>(
    '@/components/ui',
  )
  return {
    ...actual,
    ConfirmDialog: ({
      open,
      title,
      onConfirm,
      onClose,
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
    }: {
      open: boolean
      title: string
      onConfirm: () => void
      onClose: () => void
      confirmLabel?: string
      cancelLabel?: string
    }) =>
      open ? (
        <div role="dialog" aria-label={title}>
          <button type="button" onClick={onClose}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      ) : null,
  }
})

const goal: Goal = {
  id: 'g1',
  description: 'Ship reviews',
  weight: 50,
  details: 'Close the quarter strong',
  measurements: [
    {
      id: 'm1',
      kind: 'metric',
      title: 'Coverage',
      weight: 100,
      unit: '%',
      direction: 'increase',
      startValue: 0,
      targetValue: 80,
      currentValue: 10,
    },
  ],
}

const ownerOptions = [
  { id: 'p1', name: 'Ada Lovelace', title: 'Engineer' },
  { id: 'p2', name: 'Grace Hopper', title: 'Manager' },
]

function renderDetail(
  overrides: Partial<ComponentProps<typeof GoalUnifiedDetail>> = {},
) {
  const onSave = vi.fn()
  const onProgressChange = vi.fn()
  const onBack = vi.fn()
  const onSelectIndex = vi.fn()

  const result = render(
    <GoalUnifiedDetail
      goal={goal}
      index={0}
      total={2}
      owner={{ name: 'Ada Lovelace' }}
      defaultOwnerId="p1"
      ownerOptions={ownerOptions}
      cycleLabel="Q2 2026"
      isCurrentCycle
      status="draft"
      commentAuthorName="Ada Lovelace"
      canEdit
      canUpdateProgress
      canRemove
      onSave={onSave}
      onProgressChange={onProgressChange}
      onBack={onBack}
      onSelectIndex={onSelectIndex}
      {...overrides}
    />,
  )

  return { ...result, onSave, onProgressChange, onBack, onSelectIndex }
}

describe('GoalUnifiedDetail', () => {
  it('enters edit mode on the same page without swapping layouts', () => {
    renderDetail()

    expect(
      screen.getByRole('heading', { name: 'Ship reviews' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Ship reviews')).toHaveAttribute(
      'data-mode',
      'view',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByLabelText('Ship reviews')).toHaveAttribute(
      'data-mode',
      'edit',
    )
    expect(screen.getByLabelText('Goal title')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save Changes' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Edit Employee goal' }),
    ).toBeNull()
  })

  it('saves in-place edits and returns to view mode', () => {
    const { onSave } = renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const title = screen.getByLabelText('Goal title')
    fireEvent.change(title, { target: { value: 'Ship goals V2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].description).toBe('Ship goals V2')
    expect(screen.getByLabelText('Ship goals V2')).toHaveAttribute(
      'data-mode',
      'view',
    )
  })

  it('restores the baseline when canceling dirty edits', () => {
    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Goal title'), {
      target: { value: 'Temporary title' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    const dialog = screen.getByRole('dialog', { name: 'Discard changes?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard' }))

    expect(
      screen.getByRole('heading', { name: 'Ship reviews' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Ship reviews')).toHaveAttribute(
      'data-mode',
      'view',
    )
  })

  it('asks before navigating away with dirty edits', () => {
    const { onBack } = renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Goal title'), {
      target: { value: 'Ship reviews more' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(onBack).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Discard changes?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('picks a line manager goal as the cascade in edit mode', () => {
    const { onSave } = renderDetail({
      cascadeFrom: {
        managerName: 'Grace Hopper',
        options: [
          {
            id: 'mgr-goal',
            title: 'Raise the quality bar',
            managerName: 'Grace Hopper',
          },
        ],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add cascading from' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascading from' }))
    fireEvent.click(
      screen.getByRole('option', { name: /Raise the quality bar/ }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({
      cascadedFromGoalId: 'mgr-goal',
      linkedGoalLabel: 'Raise the quality bar',
    })
  })

  it('shows who this goal was cascaded to in view mode', () => {
    renderDetail({
      cascadedTo: [
        {
          goalId: 'c1',
          goalTitle: 'Untitled Cascading Goal from Line Manager',
          personId: 'r1',
          personName: 'Direct Report',
        },
      ],
    })

    expect(screen.getByText('Cascaded to')).toBeInTheDocument()
    expect(
      screen.getByText('Untitled Cascading Goal from Line Manager'),
    ).toBeInTheDocument()
    expect(screen.getByText('Direct Report')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Direct Report' })).toBeInTheDocument()
  })

  it('hides edit controls when the goal is read-only', () => {
    renderDetail({ canEdit: false, canUpdateProgress: false, canRemove: false })

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Ship reviews' }),
    ).toBeInTheDocument()
  })

  it('allows progress updates while goals are pending approval', () => {
    const { onProgressChange } = renderDetail({
      status: 'submitted',
      canEdit: false,
      canUpdateProgress: true,
      canRemove: false,
    })

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Current value for Coverage'), {
      target: { value: '25' },
    })

    expect(onProgressChange).toHaveBeenCalledTimes(1)
    const updated = onProgressChange.mock.calls[0][0] as Goal
    expect(updated.measurements[0]).toMatchObject({ currentValue: 25 })
  })

  it('does not put batch approve on a single goal', () => {
    renderDetail({ status: 'submitted' })

    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Send Back' })).toBeNull()
  })

  it('changes a metric into a to-do list from the card menu', () => {
    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Options for Coverage' }))
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Change to a To-Do List' }),
    )

    expect(screen.getByRole('region', { name: 'To-do list' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Metric name')).toBeNull()
  })

  it('keeps the summary cards visible while editing', () => {
    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    const summary = screen.getByRole('group', { name: 'Goal summary' })
    expect(within(summary).getByText('Cycle')).toBeInTheDocument()
    expect(within(summary).getByText('Completion')).toBeInTheDocument()
    expect(
      within(summary).getByLabelText('Goal weight percent'),
    ).toHaveValue(50)
  })

  it('starts a new goal with no measures so the user can choose', () => {
    renderDetail({
      isNew: true,
      goal: {
        ...goal,
        description: '',
        measurements: [],
      },
    })

    expect(screen.getByLabelText('Goal title')).toBeInTheDocument()
    expect(screen.queryByLabelText('Metric name')).toBeNull()
    expect(screen.queryByRole('region', { name: 'To-do list' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Add a Number' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a To-Do' })).toBeInTheDocument()
  })

  it('hides Add a To-Do once a checklist exists', () => {
    renderDetail({
      goal: {
        ...goal,
        measurements: [
          {
            id: 't1',
            kind: 'milestone',
            title: 'Draft the plan',
            weight: 100,
            complete: false,
          },
        ],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.queryByRole('button', { name: 'Add a To-Do' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeInTheDocument()
  })

  it('edits checklist weight and redistributes across tasks', () => {
    renderDetail({
      goal: {
        ...goal,
        measurements: [
          {
            id: 'm1',
            kind: 'metric',
            title: 'Coverage',
            weight: 50,
            unit: '%',
            direction: 'increase',
            startValue: 0,
            targetValue: 80,
            currentValue: 10,
          },
          {
            id: 't1',
            kind: 'milestone',
            title: 'Draft the plan',
            weight: 30,
            complete: false,
          },
          {
            id: 't2',
            kind: 'milestone',
            title: 'Ship the plan',
            weight: 20,
            complete: false,
          },
        ],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Checklist weight'), {
      target: { value: '40' },
    })

    expect(screen.getByLabelText('Weight for Draft the plan')).toHaveValue(24)
    expect(screen.getByLabelText('Weight for Ship the plan')).toHaveValue(16)
  })

  it('blocks save until measurement weights add up to 100', () => {
    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Weight for Coverage'), {
      target: { value: '60' },
    })

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Measurement weights must total 100%',
    )
  })

  it('blocks save when the goal name is empty', () => {
    const { onSave } = renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Goal title'), {
      target: { value: '' },
    })

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Goal name is required')
    expect(onSave).not.toHaveBeenCalled()
  })
})
