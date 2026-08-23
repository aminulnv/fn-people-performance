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
    expect(within(number).getByRole('img', { name: 'Number' })).toBeInTheDocument()
    expect(milestone).not.toHaveTextContent('Milestone')
    expect(
      screen.getByRole('button', {
        name: 'Remove Prepare Product Requirement Doc',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove CSAT' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /metric 1/i })).toBeNull()
  })

  it('adds measures with quiet actions instead of radio cards', () => {
    renderEditor({
      id: 'g1',
      description: 'Ship quality',
      weight: 100,
      measurements: [],
    })

    expect(
      screen.getByRole('button', { name: 'Add milestone measure' }),
    ).toHaveTextContent('Milestone')
    expect(
      screen.getByRole('button', { name: 'Add number measure' }),
    ).toHaveTextContent('Number')
    expect(screen.queryByText('Track completion')).toBeNull()
    expect(screen.queryByText('Track a value')).toBeNull()
    expect(screen.queryByText(/Weights total/)).toBeNull()
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

    fireEvent.click(screen.getByRole('button', { name: 'Add number measure' }))

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
