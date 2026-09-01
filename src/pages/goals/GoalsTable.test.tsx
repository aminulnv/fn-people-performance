import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
  it('expands and collapses all measure rows from the header button', () => {
    const second: Goal = {
      ...goalWithMeasures,
      id: 'g2',
      description: 'Grow manager coaching coverage',
      weight: 60,
    }
    render(
      <GoalsTable
        rows={[
          { goal: goalWithMeasures, title: goalWithMeasures.description },
          { goal: second, title: second.description },
        ]}
      />,
    )

    expect(
      screen.queryByText('Primary outcome completion'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))

    expect(screen.getAllByText('Primary outcome completion')).toHaveLength(2)
    expect(
      screen.getByRole('button', { name: 'Collapse all' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }))

    expect(
      screen.queryByText('Primary outcome completion'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Expand all' }),
    ).toBeInTheDocument()
  })

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
    expect(document.querySelectorAll('.pd-goals-table__branch')).toHaveLength(4)
    expect(document.querySelectorAll('.pd-goals-table__branch--weight')).toHaveLength(2)
    expect(document.querySelector('.pd-goals-table__weight-cell--stem')).toBeTruthy()
  })

  it('shows a proof link on the nested measure when one is saved', () => {
    render(
      <GoalsTable
        rows={[
          {
            goal: {
              ...goalWithMeasures,
              measurements: [
                {
                  ...goalWithMeasures.measurements[0]!,
                  proofUrl: 'https://dash.fn/outcome',
                },
                goalWithMeasures.measurements[1]!,
              ],
            },
            title: goalWithMeasures.description,
          },
        ]}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    const link = screen.getByRole('link', {
      name: 'Open proof at dash.fn/outcome',
    })
    expect(link).toHaveAttribute('href', 'https://dash.fn/outcome')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveClass('pd-goal-proof__url-btn', 'is-linked')
    expect(link).not.toHaveTextContent('dash.fn')
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
    rerender(
      <GoalsTable {...props} openGoalId="g1" openMeasureKey="m1" />,
    )

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

  it('hides the measure Progress button from metric and milestone rows', () => {
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

    expect(screen.getByText('Primary outcome completion')).toBeInTheDocument()
    expect(screen.getByText('Quality process')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Progress for/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Update checklist/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Progress Updates')).not.toBeInTheDocument()
  })

  it('shows a goal metrics summary and update history on progress info hover', async () => {
    render(
      <GoalsTable
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
      />,
    )

    const goalInfo = screen.getByRole('button', {
      name: 'Progress details for Deliver the core People & Culture outcomes',
    })
    fireEvent.mouseEnter(goalInfo.closest('.pd-tooltip')!)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Goal summary')
    expect(tip).toHaveTextContent('Overall progress')
    expect(tip).toHaveTextContent('2 metrics')
    expect(tip).toHaveTextContent('Primary outcome completion')
    expect(tip).toHaveTextContent('Quality process')
    const metricLog = tip.querySelector(
      '[aria-label="Progress updates for Primary outcome completion"]',
    )
    expect(metricLog).toBeInstanceOf(HTMLDetailsElement)
    expect(metricLog).not.toHaveAttribute('open')
    expect(
      tip.querySelector('[aria-label="Progress updates for Quality process"]'),
    ).toBeNull()
    fireEvent.click(metricLog!.querySelector('summary')!)
    expect(metricLog).toHaveAttribute('open')
    expect(tip).toHaveTextContent('0 →')
    expect(tip).toHaveTextContent('60')
  })

  it('shows the single-metric tip on nested measure progress info hover', async () => {
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

    const measureInfo = screen.getByRole('button', {
      name: 'Progress details for Primary outcome completion',
    })
    fireEvent.mouseEnter(measureInfo.closest('.pd-tooltip')!)
    const measureTip = await screen.findByRole('tooltip')
    expect(measureTip).toHaveTextContent('Increase metric')
    expect(measureTip).toHaveTextContent('Primary outcome completion')
    expect(measureTip).not.toHaveTextContent('Goal summary')
    expect(measureTip).not.toHaveTextContent('Quality process')
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
      screen.queryByRole('button', { name: 'Distribute Evenly' }),
    ).not.toBeInTheDocument()
  })

  it('treats a 100% total as an error when a goal has no weight', () => {
    const onDistributeWeights = vi.fn()
    render(
      <GoalsTable
        rows={[
          { goal: { ...goalWithMeasures, weight: 40 }, title: 'Quality' },
          {
            goal: { ...goalWithMeasures, id: 'g2', weight: 35 },
            title: 'Delivery',
          },
          {
            goal: { ...goalWithMeasures, id: 'g3', weight: 25 },
            title: 'Collaboration',
          },
          {
            goal: { ...goalWithMeasures, id: 'g4', weight: 0 },
            title: 'This is a test goal',
          },
          {
            goal: { ...goalWithMeasures, id: 'g5', weight: 0 },
            title: 'test',
          },
        ]}
        canEditWeight
        onDistributeWeights={onDistributeWeights}
      />,
    )

    expect(
      screen.getByRole('columnheader', { name: 'Weight 100%' }),
    ).toBeInTheDocument()
    expect(document.querySelector('.pd-goals-table__weight-head-total')).toHaveClass(
      'pd-goals-table__weight-head-total--short',
    )
    expect(
      screen.getByRole('img', { name: 'Every goal needs a weight.' }),
    ).toBeInTheDocument()
    expect(document.querySelector('.pd-goals-table')).toHaveClass(
      'pd-goals-table--weight-error',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Distribute Evenly' }))
    expect(onDistributeWeights).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'g1', weight: 20 }),
      expect.objectContaining({ id: 'g2', weight: 20 }),
      expect.objectContaining({ id: 'g3', weight: 20 }),
      expect.objectContaining({ id: 'g4', weight: 20 }),
      expect.objectContaining({ id: 'g5', weight: 20 }),
    ])
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

    fireEvent.click(screen.getByRole('button', { name: 'Distribute Evenly' }))
    expect(onDistributeWeights).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'g1', weight: 50 }),
      expect.objectContaining({ id: 'g2', weight: 50 }),
    ])
  })

  it('lets a lone measure weight be edited in the expanded table row', () => {
    const onMeasureWeightChange = vi.fn()
    const soloGoal: Goal = {
      ...goalWithMeasures,
      measurements: [{ ...goalWithMeasures.measurements[0]!, weight: 0 }],
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

    const weightInput = screen.getByLabelText(
      'Weight for Primary outcome completion',
    )
    expect(weightInput).toHaveValue('')
    fireEvent.change(weightInput, { target: { value: '100' } })
    fireEvent.blur(weightInput)
    expect(onMeasureWeightChange).toHaveBeenCalledWith(
      soloGoal.id,
      expect.arrayContaining([
        expect.objectContaining({ weight: 100 }),
      ]),
    )
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

  it('marks measure weight cells red when metrics for that goal do not total 100%', () => {
    const unbalanced: Goal = {
      ...goalWithMeasures,
      weight: 100,
      measurements: [
        { ...goalWithMeasures.measurements[0]!, weight: 10 },
        {
          id: 'm2',
          kind: 'metric',
          title: 'Second metric',
          weight: 15,
          unit: 'number',
          direction: 'increase',
          startValue: 0,
          currentValue: 0,
          targetValue: 100,
        },
        {
          id: 'm3',
          kind: 'metric',
          title: 'Third metric',
          weight: 35,
          unit: 'number',
          direction: 'increase',
          startValue: 0,
          currentValue: 0,
          targetValue: 100,
        },
        {
          id: 'm4',
          kind: 'metric',
          title: 'Fourth metric',
          weight: 20,
          unit: 'number',
          direction: 'increase',
          startValue: 0,
          currentValue: 0,
          targetValue: 100,
        },
      ],
    }
    const balanced: Goal = {
      ...goalWithMeasures,
      id: 'g2',
      description: 'Balanced goal',
      weight: 0,
      measurements: [
        {
          ...goalWithMeasures.measurements[0]!,
          id: 'm-ok',
          title: 'Balanced metric',
          weight: 100,
        },
      ],
    }
    render(
      <GoalsTable
        rows={[
          { goal: unbalanced, title: unbalanced.description },
          { goal: balanced, title: balanced.description },
        ]}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Expand Balanced goal' }))

    expect(
      document.querySelectorAll('.pd-goals-table__row--measure-weight-error'),
    ).toHaveLength(4)
    expect(
      screen.getByText('Second metric').closest('.pd-goals-table__row'),
    ).toHaveClass('pd-goals-table__row--measure-weight-error')
    expect(
      screen.getByText('Balanced metric').closest('.pd-goals-table__row'),
    ).not.toHaveClass('pd-goals-table__row--measure-weight-error')
  })

  it('marks measure weight cells red when a metric weight is blank even if others total 100%', () => {
    const withBlank: Goal = {
      ...goalWithMeasures,
      weight: 100,
      measurements: [
        { ...goalWithMeasures.measurements[0]!, weight: 100 },
        {
          id: 'm2',
          kind: 'metric',
          title: 'Blank metric',
          weight: 0,
          unit: 'number',
          direction: 'increase',
          startValue: 0,
          currentValue: 0,
          targetValue: 100,
        },
      ],
    }
    render(
      <GoalsTable rows={[{ goal: withBlank, title: withBlank.description }]} />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    expect(
      document.querySelectorAll('.pd-goals-table__row--measure-weight-error'),
    ).toHaveLength(2)
  })

  it('marks a lone blank measure weight cell red', () => {
    const soloBlank: Goal = {
      ...goalWithMeasures,
      weight: 100,
      measurements: [{ ...goalWithMeasures.measurements[0]!, weight: 0 }],
    }
    render(
      <GoalsTable rows={[{ goal: soloBlank, title: soloBlank.description }]} />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    expect(
      document.querySelector('.pd-goals-table__row--measure-weight-error'),
    ).toBeTruthy()
  })

  it('keeps measure weight cells neutral when only goal weights are short', () => {
    render(
      <GoalsTable
        rows={[
          {
            goal: {
              ...goalWithMeasures,
              weight: 40,
              measurements: [
                { ...goalWithMeasures.measurements[0]!, weight: 100 },
              ],
            },
            title: 'Quality',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Expand Quality' }))

    expect(document.querySelector('.pd-goals-table--weight-error')).toBeTruthy()
    expect(
      document.querySelector('.pd-goals-table__row--measure-weight-error'),
    ).toBeNull()
    expect(
      screen
        .getByText('Primary outcome completion')
        .closest('.pd-goals-table__row--measure'),
    ).not.toHaveClass('pd-goals-table__row--measure-weight-error')
  })

  it('marks both goal and measure weight cells red when both totals are short', () => {
    const unbalanced: Goal = {
      ...goalWithMeasures,
      weight: 40,
      measurements: [
        { ...goalWithMeasures.measurements[0]!, weight: 40 },
        {
          id: 'm2',
          kind: 'metric',
          title: 'Second metric',
          weight: 40,
          unit: 'number',
          direction: 'increase',
          startValue: 0,
          currentValue: 0,
          targetValue: 100,
        },
      ],
    }
    render(
      <GoalsTable rows={[{ goal: unbalanced, title: 'Quality' }]} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Expand Quality' }))

    expect(document.querySelector('.pd-goals-table--weight-error')).toBeTruthy()
    expect(
      document.querySelectorAll('.pd-goals-table__row--measure-weight-error'),
    ).toHaveLength(2)
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

  it('marks cascaded-from goals with a tiny label above the name', async () => {
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
    expect(icon).toHaveTextContent('Cascaded from')
    expect(icon).not.toHaveAttribute('title')
    expect(
      icon.closest('.pd-goals-table__cascade-name'),
    ).toHaveTextContent('Ship reviews')
    expect(
      icon.compareDocumentPosition(screen.getByText('Ship reviews')) &
      Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    fireEvent.mouseEnter(icon.closest('.pd-tooltip')!)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Raise quality bar')
    expect(tip).not.toHaveTextContent('No Metrics Yet')
  })

  it('shows the cascade owner and metrics in the table icon tooltip', async () => {
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
        ]}
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
      />,
    )

    fireEvent.mouseEnter(
      screen.getByRole('img', { name: 'Cascaded from Raise quality bar' })
        .closest('.pd-tooltip')!,
    )
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Raise quality bar')
    expect(tip).toHaveTextContent('Line Manager')
    expect(tip).not.toHaveTextContent('NPS')
  })

  it('marks a source goal with a cascaded-to label below the name when it already has copies', async () => {
    render(
      <GoalsTable
        rows={[
          { goal: goalWithMeasures, title: goalWithMeasures.description },
        ]}
        cascadeRecipientsFor={(goalId) =>
          goalId === 'g1'
            ? [
              {
                goalId: 'c1',
                goalTitle: 'Cut defects',
                personId: 'r1',
                personName: 'Saif Ivna Alam',
              },
            ]
            : []
        }
      />,
    )

    const toIcon = screen.getByRole('img', { name: 'Cascaded to Saif Ivna Alam' })
    expect(toIcon).toBeInTheDocument()
    expect(toIcon).toHaveTextContent('Cascaded to')
    expect(toIcon.closest('.pd-goals-table__cascade-name')).toHaveTextContent(
      goalWithMeasures.description,
    )
    expect(
      screen.queryByRole('img', { name: /Cascaded from/ }),
    ).not.toBeInTheDocument()
    fireEvent.mouseEnter(toIcon.closest('.pd-tooltip')!)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Cut defects')
    expect(tip).toHaveTextContent('Saif Ivna Alam')
  })

  it('marks a missing measure on the goal title', () => {
    render(
      <GoalsTable
        rows={[
          {
            goal: { ...goalWithMeasures, measurements: [] },
            title: 'test',
            issue: 'test still needs a metric.',
          },
        ]}
      />,
    )

    const icon = screen.getByRole('img', { name: 'Still needs a metric.' })
    const title = screen.getByText('test').closest('.pd-goals-table__title')
    expect(title).toContainElement(icon)
    expect(title).toHaveClass('pd-goals-table__title--error')
    expect(screen.queryByRole('columnheader', { name: 'Metrics' })).toBeNull()
  })

  it('shows only the metric error in the title tooltip, not the goal name', async () => {
    render(
      <GoalsTable
        rows={[
          {
            goal: { ...goalWithMeasures, measurements: [] },
            title: 'testing testing testing',
            issue: 'testing testing testing still needs a metric.',
          },
        ]}
      />,
    )

    const icon = screen.getByRole('img', { name: 'Still needs a metric.' })
    fireEvent.mouseEnter(icon.closest('.pd-tooltip')!)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Still needs a metric.')
    expect(tip).not.toHaveTextContent('testing testing testing')
  })

  it('explains the weight error in a tooltip on the header icon', async () => {
    render(
      <GoalsTable
        rows={[{ goal: { ...goalWithMeasures, weight: 40 }, title: 'Quality' }]}
      />,
    )

    const icon = screen.getByRole('img', { name: 'Weights need to add up to 100%.' })
    fireEvent.mouseEnter(icon.closest('.pd-tooltip')!)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Weights need to add up to 100%.',
    )
  })

  it('keeps a missing title error on the goal name', () => {
    render(
      <GoalsTable
        rows={[
          {
            goal: { ...goalWithMeasures, description: '', measurements: [] },
            title: 'Untitled goal 1',
            issue: 'Untitled goal 1 needs a title.',
          },
        ]}
      />,
    )

    const icon = screen.getByRole('img', { name: 'Untitled goal 1 needs a title.' })
    const title = screen.getByText('Untitled goal 1').closest('.pd-goals-table__title')
    expect(title).toContainElement(icon)
    expect(title).toHaveClass('pd-goals-table__title--error')
    expect(icon.closest('.pd-goals-table__metric')).toBeNull()
  })

  it('sits an action ribbon behind the table, peeking above the headers', () => {
    render(
      <GoalsTable
        banner={<p role="alert">Action Required Add at least 2 goals.</p>}
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
      />,
    )

    const table = screen.getByRole('table')
    const banner = screen.getByRole('alert')
    const wrap = table.parentElement
    expect(wrap).toHaveClass('pd-goals-table-wrap--action')
    expect(banner).toHaveTextContent('Add at least 2 goals')
    expect(table).not.toContainElement(banner)
    expect(wrap).toContainElement(banner)
    expect(table.compareDocumentPosition(banner)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    )
  })

  it('sits a send-back ribbon behind the table, peeking above the headers', () => {
    render(
      <GoalsTable
        leadBanner={<p role="status">Sent Back For Changes: Tighten the titles.</p>}
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
      />,
    )

    const table = screen.getByRole('table')
    const notice = screen.getByRole('status')
    const wrap = table.parentElement
    expect(wrap).toHaveClass('pd-goals-table-wrap--sendback')
    expect(notice).toHaveTextContent('Tighten the titles')
    expect(table).not.toContainElement(notice)
    expect(wrap).toContainElement(notice)
    expect(table.compareDocumentPosition(notice)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    )
  })

  it('stacks the send-back wrap behind and above the action wrap', () => {
    render(
      <GoalsTable
        leadBanner={<p role="status">Sent Back For Changes: Tighten the titles.</p>}
        banner={<p role="alert">Action Required Add at least 2 goals.</p>}
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
      />,
    )

    const table = screen.getByRole('table')
    const notice = screen.getByRole('status')
    const banner = screen.getByRole('alert')
    const actionWrap = table.parentElement
    const sendBackWrap = actionWrap?.parentElement
    expect(actionWrap).toHaveClass('pd-goals-table-wrap--action')
    expect(sendBackWrap).toHaveClass('pd-goals-table-wrap--sendback')
    expect(sendBackWrap).toContainElement(notice)
    expect(actionWrap).toContainElement(banner)
    expect(actionWrap).not.toContainElement(notice)
    expect(banner.compareDocumentPosition(notice)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    )
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

  it('shows the undo icon on the Sent back chip', () => {
    render(
      <GoalsTable
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
        status="sent_back"
      />,
    )

    const chip = screen.getByText('Sent back').closest('.pd-badge')
    expect(chip?.querySelector('svg')).toBeTruthy()
  })

  it('shows the metric glance on hover of the metric name', async () => {
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
    fireEvent.mouseEnter(
      screen.getByText('Primary outcome completion').closest('.pd-tooltip')!,
    )
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Increase metric')
    expect(tip).toHaveTextContent('Primary outcome completion')
    expect(tip).toHaveTextContent('60')
    expect(tip).toHaveTextContent('100')
  })

  it('puts the row menu in a headerless column after Progress', () => {
    render(
      <MemoryRouter>
        <GoalsTable
          rows={[{ goal: goalWithMeasures, title: 'Quality' }]}
          onDuplicate={vi.fn()}
          duplicateCycles={[
            { id: 'cycle-1', label: 'Q3 2026', statusLabel: 'Current' },
          ]}
          cycleId="cycle-1"
        />
      </MemoryRouter>,
    )

    const progressHead = screen.getByRole('columnheader', { name: 'Progress' })
    const actionsHead = screen.getByRole('columnheader', { name: 'Actions' })
    expect(progressHead).not.toContainElement(actionsHead)
    expect(actionsHead).toHaveClass('pd-goals-table__actions-head')
    expect(actionsHead.querySelector('.pd-sr-only')).toHaveTextContent('Actions')
    expect(actionsHead.textContent).toBe('Actions')

    const menu = screen.getByRole('button', { name: 'More Actions For Quality' })
    expect(menu.closest('.pd-goals-table__actions')).toBeTruthy()
    expect(progressHead.compareDocumentPosition(actionsHead) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
