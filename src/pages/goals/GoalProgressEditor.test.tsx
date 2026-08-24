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

    expect(screen.getByRole('heading', { name: 'No metrics yet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add milestones' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add number' })).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Add milestones' }))
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

    expect(screen.queryByRole('heading', { name: 'No metrics yet' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Add milestones' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add number' })).toBeInTheDocument()
  })

  it('hides the weight footer when measures already split 100% evenly', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [milestoneMeasure(50), numberMeasure(50)],
    })

    expect(screen.queryByText(/Weights total/)).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Distribute evenly' }),
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

    expect(screen.getByText('Weights do not split evenly.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Distribute evenly' }))
    expect(onChange).toHaveBeenCalled()
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
    expect(screen.getByRole('button', { name: 'Add task' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add task list' })).toBeInTheDocument()
  })

  it('locks the only measure weight at 100%', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [numberMeasure(100)],
    })

    expect(screen.queryByLabelText('Weight for CSAT')).not.toBeInTheDocument()
    expect(screen.getByLabelText('100 percent')).toBeInTheDocument()
  })

  it('splits weight evenly when a second measure is added', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Add number' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        measurements: [
          expect.objectContaining({ kind: 'milestone', weight: 50 }),
          expect.objectContaining({ kind: 'metric', weight: 50 }),
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
    fireEvent.click(screen.getByRole('button', { name: 'Add update for CSAT' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].measurements[0]).toMatchObject({
      currentValue: 3,
      progressLog: [expect.objectContaining({ from: undefined, to: 3 })],
    })
  })
})
