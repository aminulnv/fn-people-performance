import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Goal, Metric, Milestone } from '@/lib/goals/types'
import { GoalProgressEditor } from './GoalProgressEditor'

afterEach(cleanup)

const numberMeasure = (weight: number, title = 'CSAT'): Metric => ({
  id: `metric-${title}`,
  kind: 'metric',
  title,
  weight,
  unit: 'number',
  direction: 'increase',
  startValue: 1,
  targetValue: 5,
})

const milestoneMeasure = (
  weight: number,
  extra?: Partial<Milestone>,
): Milestone => ({
  id: 't1',
  kind: 'milestone',
  measureGroupId: 'g1',
  measureTitle: 'Prepare Product Requirement Doc',
  listId: 'l1',
  listTitle: 'Task List',
  title: 'Task Item 001',
  weight,
  complete: false,
  ...extra,
})

function renderEditor(goal: Goal) {
  return render(
    <GoalProgressEditor goal={goal} onChange={vi.fn()} />,
  )
}

function StatefulEditor({ initial }: { initial: Goal }) {
  const [goal, setGoal] = useState(initial)
  return <GoalProgressEditor goal={goal} onChange={setGoal} />
}

describe('GoalProgressEditor', () => {
  it('puts type, title, and delete on the card instead of a Metric 1 row', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [milestoneMeasure(50), numberMeasure(50)],
    })

    const milestone = screen.getByLabelText('Prepare Product Requirement Doc')
    const number = screen.getByLabelText('CSAT')
    expect(within(milestone).getByRole('img', { name: 'Milestone' })).toBeInTheDocument()
    expect(within(number).getByRole('img', { name: 'Metric' })).toBeInTheDocument()
    expect(milestone).not.toHaveTextContent('Milestone')
    expect(
      screen.getByRole('button', {
        name: 'Remove Prepare Product Requirement Doc',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove CSAT' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /metric 1/i })).toBeNull()
    const values = within(number).getByLabelText('Current — of target 5')
    expect(values.closest('.pd-goal-view__fold-title')).toBeTruthy()
    expect(values.closest('.pd-goal-view__fold-meta')).toBeNull()
    expect(number).toHaveAttribute('open')
  })

  it('collapses an edit measure like view mode', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [numberMeasure(100)],
    })

    const number = screen.getByLabelText('CSAT')
    expect(number).toHaveAttribute('open')
    expect(within(number).getByText('Set target')).toBeInTheDocument()

    fireEvent.click(number.querySelector('.pd-goal-view__fold-chevron')!)
    expect(number).not.toHaveAttribute('open')
    expect(
      within(number).getByRole('button', { name: 'Edit metric name' }),
    ).toBeInTheDocument()

    fireEvent.click(within(number).getByRole('button', { name: 'Edit metric name' }))
    expect(number).not.toHaveAttribute('open')
  })

  it('keeps the edit measure open when the title is clicked', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [numberMeasure(100)],
    })

    const number = screen.getByLabelText('CSAT')
    fireEvent.click(within(number).getByRole('button', { name: 'Edit metric name' }))
    expect(number).toHaveAttribute('open')
    expect(within(number).getByText('Set target')).toBeInTheDocument()
  })

  it('offers milestone and number actions when the goal has no measures', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [],
    })

    expect(screen.getByRole('heading', { name: 'No Metrics Yet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Milestones' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Number' })).toBeInTheDocument()
    expect(screen.queryByText('How will you measure this goal?')).toBeNull()
    expect(screen.queryByText('Add at least one measurement')).toBeNull()
    expect(screen.queryByText(/Weights total/)).toBeNull()
  })

  it('adds a milestone from the empty state', () => {
    const onChange = vi.fn()
    render(
      <GoalProgressEditor
        goal={{
          id: 'g1',
          description: 'Ship quality',
          weight: 100,
          measurements: [],
        }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Milestones' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        measurements: expect.arrayContaining([
          expect.objectContaining({ kind: 'milestone' }),
        ]),
      }),
    )
  })

  it('keeps add buttons after a metric exists, without the empty prompt', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [numberMeasure(100)],
    })

    expect(screen.queryByRole('heading', { name: 'No Metrics Yet' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Add Milestones' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Number' })).toBeInTheDocument()
  })

  it('hides the weight footer when measures already split 100% evenly', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [milestoneMeasure(50), numberMeasure(50)],
    })

    expect(screen.queryByText(/Weights total/)).toBeNull()
    expect(screen.queryByText('Must total 100%')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Distribute Evenly' }),
    ).toBeNull()
  })

  it('offers redistribute when the split is off', () => {
    const onChange = vi.fn()
    render(
      <GoalProgressEditor
        goal={{
          id: 'g1',
          description: 'Ship quality',
          weight: 100,
          measurements: [milestoneMeasure(70), numberMeasure(30)],
        }}
        onChange={onChange}
      />,
    )

    expect(screen.queryByText('Weights do not split evenly.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Distribute Evenly' }))
    expect(onChange).toHaveBeenCalled()
  })

  it('puts a missing metric name on the field, not under the add buttons', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [numberMeasure(50, ''), milestoneMeasure(45)],
    })

    const name = screen.getByLabelText('Metric name')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveClass('is-error')
    expect(screen.getByText('Each metric needs a name')).toBeInTheDocument()
    expect(name.parentElement).toHaveTextContent('Each metric needs a name')
    expect(
      screen.getByRole('group', { name: 'Add Metrics' }),
    ).not.toHaveTextContent('Each metric needs a name')
  })

  it('puts the weight total error in the metrics header with distribute', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [milestoneMeasure(50), numberMeasure(45)],
    })

    const heading = screen.getByRole('heading', { name: 'Metrics' })
    const ribbon = heading.parentElement
    expect(ribbon).toHaveTextContent('95%')
    expect(ribbon).toHaveTextContent('Must total 100%')
    expect(
      ribbon?.querySelector('.pd-goal-create__distribute'),
    ).toHaveTextContent('Distribute Evenly')
    expect(screen.queryByText(/Weights total/)).toBeNull()
  })

  it('flags blank metric weights in the metrics header even when others total 100%', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [numberMeasure(100), milestoneMeasure(0)],
    })

    const heading = screen.getByRole('heading', { name: 'Metrics' })
    const ribbon = heading.parentElement
    expect(ribbon).toHaveTextContent('Every metric needs a weight.')
    expect(ribbon).not.toHaveTextContent('Must total 100%')
  })

  it('hides the task-list chrome when there is only one list', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [milestoneMeasure(100)],
    })

    expect(screen.queryByDisplayValue('Task List')).toBeNull()
    expect(screen.queryByDisplayValue('Task List 1')).toBeNull()
    expect(screen.queryByText('0/1 done')).toBeNull()
    expect(screen.getByDisplayValue('Task Item 001')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Task List' })).toBeInTheDocument()
  })

  it('lets the only measure weight stay editable and blank', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [numberMeasure(0)],
    })

    expect(screen.getByLabelText('Weight for CSAT')).toBeInTheDocument()
    expect(screen.getByLabelText('Weight for CSAT')).toHaveValue('')
  })

  it('keeps a blank weight when a second measure is added', () => {
    const onChange = vi.fn()
    render(
      <GoalProgressEditor
        goal={{
          id: 'g1',
          description: 'Ship quality',
          weight: 100,
          measurements: [milestoneMeasure(100)],
        }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Number' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        measurements: [
          expect.objectContaining({ kind: 'milestone', weight: 100 }),
          expect.objectContaining({ kind: 'metric', weight: 0 }),
        ],
      }),
    )
  })

  it('lets you log a current value on a number measure', () => {
    const onChange = vi.fn()
    render(
      <GoalProgressEditor
        goal={{
          id: 'g1',
          description: 'Ship quality',
          weight: 100,
          measurements: [numberMeasure(100)],
        }}
        onChange={onChange}
        progressAuthor={{ id: '1', name: 'Aminul' }}
        cycleLabel="Q3 2026"
      />,
    )

    fireEvent.change(screen.getByLabelText('Current progress for CSAT'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Update For CSAT' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].measurements[0]).toMatchObject({
      currentValue: 3,
      progressLog: [expect.objectContaining({ from: undefined, to: 3 })],
    })
  })

  it('lets you attach a proof link on a number measure', () => {
    const onChange = vi.fn()
    render(
      <GoalProgressEditor
        goal={{
          id: 'g1',
          description: 'Ship quality',
          weight: 100,
          measurements: [numberMeasure(100)],
        }}
        onChange={onChange}
      />,
    )

    const urlButton = screen.getByRole('button', { name: 'Add Proof For CSAT' })
    expect(urlButton).not.toHaveTextContent('URL')
    expect(urlButton.closest('.pd-goal-view__fold-meta')).toBeTruthy()
    fireEvent.click(urlButton)
    fireEvent.change(screen.getByLabelText('Proof link for CSAT'), {
      target: { value: 'https://dash.fn/csat' },
    })
    fireEvent.blur(screen.getByLabelText('Proof link for CSAT'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        measurements: [
          expect.objectContaining({
            id: 'metric-CSAT',
            proofUrl: 'https://dash.fn/csat',
          }),
        ],
      }),
    )
  })

  it('lets you attach a proof link on a milestone measure', () => {
    const onChange = vi.fn()
    render(
      <GoalProgressEditor
        goal={{
          id: 'g1',
          description: 'Ship quality',
          weight: 100,
          measurements: [milestoneMeasure(100)],
        }}
        onChange={onChange}
      />,
    )

    const urlButton = screen.getByRole('button', {
      name: 'Add Proof For Prepare Product Requirement Doc',
    })
    expect(urlButton).not.toHaveTextContent('URL')
    expect(urlButton.closest('.pd-goal-view__fold-meta')).toBeTruthy()
    fireEvent.click(urlButton)
    fireEvent.change(
      screen.getByLabelText('Proof link for Prepare Product Requirement Doc'),
      { target: { value: 'https://dash.fn/prd' } },
    )
    fireEvent.blur(
      screen.getByLabelText('Proof link for Prepare Product Requirement Doc'),
    )

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        measurements: [
          expect.objectContaining({
            id: 't1',
            proofUrl: 'https://dash.fn/prd',
          }),
        ],
      }),
    )
  })

  it('does not put a proof control on checklist items', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [milestoneMeasure(100)],
    })

    expect(
      screen.queryByRole('button', { name: /proof for Task Item 001/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Proof link for Task Item 001'),
    ).not.toBeInTheDocument()
  })

  it('blocks the metric body and add actions until the metric is named', () => {
    render(
      <StatefulEditor
        initial={{
          id: 'g1',
          description: 'Ship quality',
          weight: 100,
          measurements: [],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Number' }))

    expect(screen.getByLabelText('Metric name')).toBeInTheDocument()
    expect(screen.getByText('Set target')).toBeInTheDocument()
    expect(screen.getByLabelText('Start value')).toBeDisabled()
    expect(screen.getByLabelText('Target value')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add Number' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add Milestones' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Metric name'), {
      target: { value: 'NPS' },
    })
    fireEvent.blur(screen.getByLabelText('Metric name'))

    expect(screen.getByLabelText('Start value')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Add Number' })).toBeEnabled()
  })

  it('dissolves an unnamed metric when the name field is left empty', () => {
    render(
      <StatefulEditor
        initial={{
          id: 'g1',
          description: 'Ship quality',
          weight: 100,
          measurements: [],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Number' }))
    expect(screen.getByLabelText('Metric name')).toBeInTheDocument()

    fireEvent.blur(screen.getByLabelText('Metric name'))

    expect(screen.queryByLabelText('Metric name')).toBeNull()
    expect(screen.getByRole('heading', { name: 'No Metrics Yet' })).toBeInTheDocument()
  })

  it('blocks tasks on a milestone until it is named, then dissolves if left blank', () => {
    render(
      <StatefulEditor
        initial={{
          id: 'g1',
          description: 'Ship quality',
          weight: 100,
          measurements: [],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Milestones' }))

    expect(screen.getByLabelText('Milestone name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add Task List' })).toBeDisabled()
    expect(screen.getByLabelText('Task')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add Milestones' })).toBeDisabled()

    fireEvent.blur(screen.getByLabelText('Milestone name'))

    expect(screen.queryByLabelText('Milestone name')).toBeNull()
    expect(screen.getByRole('heading', { name: 'No Metrics Yet' })).toBeInTheDocument()
  })
})
