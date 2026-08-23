import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalMeasureLogHover } from './GoalMeasureLogHover'
import type { Metric, Milestone, ProgressLogEntry } from '@/lib/goals/types'

afterEach(cleanup)

const metric: Metric = {
  id: 'm1',
  kind: 'metric',
  title: 'Primary outcome completion',
  weight: 100,
  unit: 'number',
  direction: 'increase',
  startValue: 0,
  currentValue: 60,
  targetValue: 100,
}

const entry: ProgressLogEntry = {
  id: 'log-1',
  recordedAt: '2026-08-20T09:00:00.000Z',
  authorName: 'Ada',
  from: 0,
  to: 60,
}

describe('GoalMeasureLogHover', () => {
  it('hides when there are no logs and logging is closed', () => {
    const { container } = render(
      <GoalMeasureLogHover measureName="Primary outcome completion" entries={[]} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('shows Log without a count when logging is allowed with no history', () => {
    render(
      <GoalMeasureLogHover
        measureName="Primary outcome completion"
        entries={[]}
        metric={metric}
        canLog
        onRecord={vi.fn()}
      />,
    )

    const log = screen.getByRole('button', {
      name: 'Log progress for Primary outcome completion',
    })
    expect(log).toHaveTextContent('Log')
    expect(log.querySelector('svg')).toBeTruthy()
    expect(log.querySelector('.pd-count-badge')).toBeNull()
  })

  it('uses the same Log button when history is read-only', () => {
    render(
      <GoalMeasureLogHover
        measureName="Primary outcome completion"
        entries={[entry]}
      />,
    )

    const log = screen.getByRole('button', {
      name: 'Log progress for Primary outcome completion, 1 update',
    })
    expect(log).toHaveTextContent('Log')
    expect(log.querySelector('svg')).toBeTruthy()
    expect(log.querySelector('.pd-count-badge')).toHaveClass(
      'pd-count-badge--muted',
    )
    expect(
      screen.queryByRole('button', {
        name: '1 progress log for Primary outcome completion',
      }),
    ).not.toBeInTheDocument()

    fireEvent.mouseEnter(log.parentElement!)

    expect(
      screen.getByRole('dialog', { name: 'Progress logs 1 update' }),
    ).toBeInTheDocument()
    expect(screen.getByText('0 → 60')).toBeInTheDocument()
    expect(
      screen.queryByLabelText(
        'Current progress for Primary outcome completion',
      ),
    ).not.toBeInTheDocument()
  })

  it('puts the log count inside the Log button', () => {
    render(
      <GoalMeasureLogHover
        measureName="Primary outcome completion"
        entries={[entry]}
        metric={metric}
        canLog
        onRecord={vi.fn()}
      />,
    )

    const log = screen.getByRole('button', {
      name: 'Log progress for Primary outcome completion, 1 update',
    })
    expect(log).toHaveTextContent('Log')
    expect(log.querySelector('svg')).toBeTruthy()
    expect(log.querySelector('.pd-count-badge')).toHaveTextContent('1')
    expect(log.querySelector('.pd-count-badge')).toHaveClass(
      'pd-count-badge--muted',
    )
    expect(
      screen.queryByRole('button', {
        name: '1 progress log for Primary outcome completion',
      }),
    ).not.toBeInTheDocument()
  })

  it('lets the Log button open the add field and commit a value', () => {
    const onRecord = vi.fn()
    render(
      <GoalMeasureLogHover
        measureName="Primary outcome completion"
        entries={[entry]}
        metric={metric}
        canLog
        onRecord={onRecord}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Log progress for Primary outcome completion, 1 update',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Progress logs 1 update' }),
    ).toBeInTheDocument()

    const dialog = screen.getByRole('dialog', { name: 'Progress logs 1 update' })
    const field = screen.getByLabelText(
      'Current progress for Primary outcome completion',
    )
    const history = screen.getByLabelText(
      'Progress history for Primary outcome completion',
    )
    expect(
      field.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(dialog).toContainElement(field)
    expect(dialog).toContainElement(history)
    fireEvent.change(field, { target: { value: '72' } })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Add update for Primary outcome completion',
      }),
    )

    expect(onRecord).toHaveBeenCalledWith(72)
  })

  it('opens a milestone checklist and toggles a task', () => {
    const onToggleTodo = vi.fn()
    const todo: Milestone = {
      id: 't1',
      kind: 'milestone',
      title: 'Triage incoming defects',
      weight: 0,
      complete: false,
    }

    render(
      <GoalMeasureLogHover
        measureName="Quality process"
        entries={[]}
        lists={[{ listKey: 'l1', listTitle: 'Process', todos: [todo] }]}
        canLog
        onToggleTodo={onToggleTodo}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Update checklist for Quality process',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Checklist 0 of 1 done' }),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Mark Triage incoming defects complete',
      }),
    )
    expect(onToggleTodo).toHaveBeenCalledWith('t1', true)
    expect(
      screen.getByRole('dialog', { name: 'Checklist 0 of 1 done' }).parentElement,
    ).toBe(document.body)
  })
})
