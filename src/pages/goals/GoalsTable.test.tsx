import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '@/lib/goals/types'
import { GoalsTable } from './GoalsTable'

afterEach(cleanup)

const goalWithMeasures: Goal = {
  id: 'g1',
  description: 'Deliver the core People & Culture outcomes',
  weight: 40,
  measurements: [
    {
      id: 'm1',
      kind: 'metric',
      title: 'Primary outcome completion',
      weight: 100,
      unit: 'number',
      direction: 'increase',
      startValue: 0,
      currentValue: 60,
      targetValue: 100,
      progressLog: [
        {
          id: 'log-1',
          recordedAt: '2026-08-20T09:00:00.000Z',
          authorName: 'Ada',
          from: 0,
          to: 60,
        },
      ],
    },
    {
      id: 't1',
      kind: 'milestone',
      measureGroupId: 'mg1',
      measureTitle: 'Quality process',
      listId: 'l1',
      listTitle: 'Process',
      title: 'Triage incoming defects',
      weight: 0,
      complete: false,
    },
  ],
}

describe('GoalsTable nested measures', () => {
  it('nests metric and milestone rows under the goal with type icons', () => {
    render(
      <GoalsTable
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    expect(screen.getByRole('img', { name: 'Metric' })).toBeInTheDocument()
    expect(screen.getByText('Primary outcome completion')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Milestone' })).toBeInTheDocument()
    expect(screen.getByText('Quality process')).toBeInTheDocument()
    expect(screen.queryByText('Metric')).not.toBeInTheDocument()
    expect(screen.queryByText('Milestone')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.pd-goals-table__branch')).toHaveLength(2)
  })

  it('highlights the measure that opened the goal window', () => {
    const onOpen = vi.fn()
    const props = {
      rows: [{ goal: goalWithMeasures, title: goalWithMeasures.description }],
      onOpen,
      openGoalId: null as string | null,
    }
    const { rerender } = render(<GoalsTable {...props} />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )
    fireEvent.click(screen.getByText('Primary outcome completion'))

    expect(onOpen).toHaveBeenCalledWith('g1', 'm1')
    rerender(<GoalsTable {...props} openGoalId="g1" />)

    expect(
      screen.getByText('Primary outcome completion').closest('[role="row"]'),
    ).toHaveClass('is-selected')
    expect(
      screen.getByText('Quality process').closest('[role="row"]'),
    ).not.toHaveClass('is-selected')
    expect(
      screen
        .getByText('Deliver the core People & Culture outcomes')
        .closest('[role="row"]'),
    ).not.toHaveClass('is-selected')
  })

  it('highlights the goal row when the window is opened from the goal', () => {
    const onOpen = vi.fn()
    const props = {
      rows: [{ goal: goalWithMeasures, title: goalWithMeasures.description }],
      onOpen,
      openGoalId: null as string | null,
    }
    const { rerender } = render(<GoalsTable {...props} />)

    fireEvent.click(
      screen.getByText('Deliver the core People & Culture outcomes'),
    )
    rerender(<GoalsTable {...props} openGoalId="g1" />)

    expect(
      screen
        .getByText('Deliver the core People & Culture outcomes')
        .closest('[role="row"]'),
    ).toHaveClass('is-selected')
  })

  it('puts the log count inside the Log button next to the measure name', () => {
    render(
      <GoalsTable
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
        canLogProgress
        onRecordMetricProgress={vi.fn()}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    const log = screen.getByRole('button', {
      name: 'Log progress for Primary outcome completion, 1 update',
    })
    expect(log).toHaveTextContent('Log')
    expect(log.querySelector('.pd-count-badge')).toHaveTextContent('1')
    expect(log.closest('.pd-goals-table__goal')).toBeTruthy()
    expect(log.closest('.pd-goals-table__metric')).toBeNull()
    expect(screen.queryByText('Progress logs')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: '0 progress logs for Quality process',
      }),
    ).not.toBeInTheDocument()

    fireEvent.mouseEnter(log.parentElement!)
    expect(screen.getByText('0 → 60')).toBeInTheDocument()
  })

  it('lets a metric Log button record progress from the hover menu', () => {
    const onRecordMetricProgress = vi.fn()
    render(
      <GoalsTable
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
        canLogProgress
        onRecordMetricProgress={onRecordMetricProgress}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    const measureName = screen.getByText('Primary outcome completion')
    const log = screen.getByRole('button', {
      name: 'Log progress for Primary outcome completion, 1 update',
    })
    expect(log.closest('.pd-goals-table__goal')).toBeTruthy()
    expect(log.closest('.pd-goals-table__metric')).toBeNull()
    expect(
      measureName.compareDocumentPosition(log) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.click(log)
    fireEvent.change(
      screen.getByLabelText('Current progress for Primary outcome completion'),
      { target: { value: '80' } },
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Add update for Primary outcome completion',
      }),
    )

    expect(onRecordMetricProgress).toHaveBeenCalledWith('g1', 'm1', 80)
  })

  it('lets a milestone Log button toggle tasks from the hover menu', () => {
    const onToggleMilestone = vi.fn()
    render(
      <GoalsTable
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
        canLogProgress
        onToggleMilestone={onToggleMilestone}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    const log = screen.getByRole('button', {
      name: 'Update checklist for Quality process',
    })
    expect(log.closest('.pd-goals-table__goal')).toBeTruthy()

    fireEvent.click(log)
    expect(
      screen.getByRole('heading', { name: 'Checklist 0 of 1 done' }),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Mark Triage incoming defects complete',
      }),
    )
    expect(onToggleMilestone).toHaveBeenCalledWith('g1', 't1', true)
  })

  it('shows the total weight allocated across goal rows', () => {
    render(
      <GoalsTable
        rows={[
          { goal: goalWithMeasures, title: goalWithMeasures.description },
          {
            goal: { ...goalWithMeasures, id: 'g2', weight: 35 },
            title: 'Grow capability',
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('columnheader', { name: 'Weight 75%' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('75% allocated · 25% left')).not.toBeInTheDocument()
    expect(document.querySelector('.pd-goals-table__weight-head-total')).toHaveClass(
      'pd-goals-table__weight-head-total--short',
    )
    expect(
      screen.getByRole('img', { name: 'Weights need to add up to 100%.' }),
    ).toBeInTheDocument()
    expect(document.querySelector('.pd-goals-table')).toHaveClass(
      'pd-goals-table--weight-error',
    )
  })

  it('marks the total complete when goal weights add to 100%', () => {
    render(
      <GoalsTable
        rows={[
          { goal: { ...goalWithMeasures, weight: 60 }, title: 'Quality' },
          {
            goal: { ...goalWithMeasures, id: 'g2', weight: 40 },
            title: 'Delivery',
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('columnheader', { name: 'Weight 100%' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('100% allocated')).not.toBeInTheDocument()
    expect(document.querySelector('.pd-goals-table__weight-head-total')).toHaveClass(
      'pd-goals-table__weight-head-total--complete',
    )
    expect(
      screen.queryByRole('img', { name: 'Weights need to add up to 100%.' }),
    ).not.toBeInTheDocument()
    expect(document.querySelector('.pd-goals-table')).not.toHaveClass(
      'pd-goals-table--weight-error',
    )
    expect(
      screen.queryByRole('button', { name: 'Distribute evenly' }),
    ).not.toBeInTheDocument()
  })

  it('distributes leftover weight evenly when the owner asks', () => {
    const onDistributeWeights = vi.fn()
    render(
      <GoalsTable
        rows={[
          { goal: { ...goalWithMeasures, weight: 40 }, title: 'Quality' },
          {
            goal: { ...goalWithMeasures, id: 'g2', weight: 35 },
            title: 'Delivery',
          },
        ]}
        canEditWeight
        onDistributeWeights={onDistributeWeights}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Distribute evenly' }))
    expect(onDistributeWeights).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'g1', weight: 50 }),
      expect.objectContaining({ id: 'g2', weight: 50 }),
    ])
  })

  it('locks a lone measure at 100% in the expanded table row', () => {
    const onMeasureWeightChange = vi.fn()
    const soloGoal: Goal = {
      ...goalWithMeasures,
      measurements: [goalWithMeasures.measurements[0]!],
    }
    render(
      <GoalsTable
        rows={[{ goal: soloGoal, title: soloGoal.description }]}
        canEditWeight
        onMeasureWeightChange={onMeasureWeightChange}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    expect(
      screen.queryByLabelText('Weight for Primary outcome completion'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('lets a measure weight be edited from the expanded table row', () => {
    const onMeasureWeightChange = vi.fn()
    render(
      <GoalsTable
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
        canEditWeight
        onMeasureWeightChange={onMeasureWeightChange}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    const input = screen.getByLabelText('Weight for Primary outcome completion')
    fireEvent.change(input, { target: { value: '80' } })
    fireEvent.blur(input)

    expect(onMeasureWeightChange).toHaveBeenCalledWith(
      'g1',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'm1',
          kind: 'metric',
          weight: 80,
        }),
      ]),
    )
  })

  it('steps a goal weight with the hover plus control', () => {
    const onWeightChange = vi.fn()
    render(
      <GoalsTable
        rows={[{ goal: { ...goalWithMeasures, weight: 40 }, title: 'Quality' }]}
        canEditWeight
        onWeightChange={onWeightChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Increase Weight for Quality' }))
    expect(onWeightChange).toHaveBeenCalledWith('g1', 45)
  })

  it('caps a weight edit so allocated weight cannot go over 100%', () => {
    const onWeightChange = vi.fn()
    render(
      <GoalsTable
        rows={[
          { goal: { ...goalWithMeasures, weight: 40 }, title: 'Quality' },
          {
            goal: { ...goalWithMeasures, id: 'g2', weight: 35 },
            title: 'Delivery',
          },
        ]}
        canEditWeight
        onWeightChange={onWeightChange}
      />,
    )

    const input = screen.getByLabelText('Weight for Quality')
    fireEvent.change(input, { target: { value: '80' } })
    fireEvent.blur(input)

    expect(onWeightChange).toHaveBeenCalledWith('g1', 65)
  })

  it('marks cascaded-from goals with a down-right arrow before the name', async () => {
    render(
      <GoalsTable
        rows={[
          {
            goal: {
              ...goalWithMeasures,
              cascadedFromGoalId: 'mgr-1',
              linkedGoalLabel: 'Raise quality bar',
            },
            title: 'Ship reviews',
          },
          {
            goal: { ...goalWithMeasures, id: 'g2', weight: 60 },
            title: 'Grow capability',
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Cascaded from Raise quality bar' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'Cascaded from a manager goal' }),
    ).not.toBeInTheDocument()

    const icon = screen.getByRole('img', {
      name: 'Cascaded from Raise quality bar',
    })
    expect(icon).not.toHaveAttribute('title')
    expect(
      icon.compareDocumentPosition(screen.getByText('Ship reviews')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    fireEvent.mouseEnter(icon.closest('.pd-tooltip')!)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Cascaded from Raise quality bar',
    )
  })

  it('marks a source goal with a sent-to icon after the name when it already has copies', () => {
    render(
      <GoalsTable
        rows={[
          { goal: goalWithMeasures, title: goalWithMeasures.description },
        ]}
        cascadeRecipientsFor={(goalId) =>
          goalId === 'g1' ? [{ personName: 'Saif Ivna Alam' }] : []
        }
      />,
    )

    const toIcon = screen.getByRole('img', { name: 'Cascaded to Saif Ivna Alam' })
    expect(toIcon).toBeInTheDocument()
    expect(toIcon.closest('.pd-goals-table__title')).toHaveTextContent(
      goalWithMeasures.description,
    )
    expect(
      screen.queryByRole('img', { name: /Cascaded from/ }),
    ).not.toBeInTheDocument()
  })

  it('places a status chip next to the Goals column header', () => {
    render(
      <GoalsTable
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
        status="draft"
      />,
    )

    expect(
      screen.getByRole('columnheader', { name: 'Goals Draft' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Goals Draft' }),
    ).toHaveTextContent('Draft')
  })
})
