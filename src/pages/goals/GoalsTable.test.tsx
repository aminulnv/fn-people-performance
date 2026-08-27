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

    expect(
      screen.getByRole('link', { name: /dash.fn\/outcome/ }),
    ).toHaveAttribute('href', 'https://dash.fn/outcome')
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
      screen.getByRole('button', {
        name: 'Update checklist for Quality process',
      }),
    ).toBeInTheDocument()

    fireEvent.mouseEnter(log.parentElement!)
    expect(
      screen.getByText(
        (_, node) =>
          node?.classList.contains('pd-goal-progress-log__change') === true &&
          node.textContent === '0 → 60',
      ),
    ).toBeInTheDocument()
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
      screen.getByRole('heading', { name: 'Progress logs None yet' }),
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
    fireEvent.click(screen.getByRole('button', { name: 'Distribute evenly' }))
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
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Raise quality bar')
    expect(tip).not.toHaveTextContent('No metrics yet')
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

  it('marks a source goal with a sent-to icon after the name when it already has copies', async () => {
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
    expect(toIcon.closest('.pd-goals-table__title')).toHaveTextContent(
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

  it('marks a missing measure in the Metrics cell, not on the title', () => {
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

    const icons = screen.getAllByRole('img', { name: 'Still needs a metric.' })
    const cellIcon = icons.find((icon) => icon.closest('.pd-goals-table__metric'))
    expect(cellIcon).toBeTruthy()
    const title = screen.getByText('test').closest('.pd-goals-table__title')
    const metrics = cellIcon!.closest('.pd-goals-table__metric')
    expect(title).not.toContainElement(cellIcon!)
    expect(title).not.toHaveClass('pd-goals-table__title--error')
    expect(metrics).toContainElement(cellIcon!)
    expect(metrics).toHaveClass('pd-goals-table__metric--error')
  })

  it('shows an error icon on the Metrics header when a row has a metric issue', () => {
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

    const header = screen.getByRole('columnheader', { name: 'Metrics' })
    const headerIcon = header.querySelector('[role="img"]')
    expect(headerIcon).toHaveAttribute('aria-label', 'Still needs a metric.')
    expect(document.querySelector('.pd-goals-table')).toHaveClass(
      'pd-goals-table--metric-error',
    )
  })

  it('shows only the metric error in the Metrics tooltip, not the goal name', async () => {
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

    const cellIcon = screen
      .getAllByRole('img', { name: 'Still needs a metric.' })
      .find((icon) => icon.closest('.pd-goals-table__metric'))
    fireEvent.mouseEnter(cellIcon!.closest('.pd-tooltip')!)
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
        banner={<p role="alert">Action required Add at least 2 goals.</p>}
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
        leadBanner={<p role="status">Sent back for changes: Tighten the titles.</p>}
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
        leadBanner={<p role="status">Sent back for changes: Tighten the titles.</p>}
        banner={<p role="alert">Action required Add at least 2 goals.</p>}
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

  it('puts the row menu in a headerless column after Metrics', () => {
    render(
      <MemoryRouter>
        <GoalsTable
          rows={[{ goal: goalWithMeasures, title: 'Quality' }]}
          onDuplicate={vi.fn()}
        />
      </MemoryRouter>,
    )

    const metricsHead = screen.getByRole('columnheader', { name: 'Metrics' })
    const actionsHead = screen.getByRole('columnheader', { name: 'Actions' })
    expect(metricsHead).not.toContainElement(actionsHead)
    expect(actionsHead).toHaveClass('pd-goals-table__actions-head')
    expect(actionsHead.querySelector('.pd-sr-only')).toHaveTextContent('Actions')
    expect(actionsHead.textContent).toBe('Actions')

    const menu = screen.getByRole('button', { name: 'More actions for Quality' })
    expect(menu.closest('.pd-goals-table__actions')).toBeTruthy()
    expect(menu.closest('.pd-goals-table__metric')).toBeNull()
    expect(metricsHead.compareDocumentPosition(actionsHead) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
