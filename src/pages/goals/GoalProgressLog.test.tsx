import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GoalProgressLog, progressLogCountLabel } from './GoalProgressLog'
import type { ProgressLogEntry } from '@/lib/goals/types'

afterEach(cleanup)

const metricEntry: ProgressLogEntry = {
  id: 'log-metric',
  recordedAt: '2026-08-20T09:00:00.000Z',
  authorName: 'Ada',
  from: 0,
  to: 2,
}

const completed: ProgressLogEntry = {
  id: 'log-done',
  recordedAt: '2026-08-20T10:00:00.000Z',
  authorName: 'Ada',
  from: 0,
  to: 1,
  label: 'Task Item 001',
}

const incomplete: ProgressLogEntry = {
  id: 'log-open',
  recordedAt: '2026-08-20T11:00:00.000Z',
  authorName: 'Ada',
  from: 1,
  to: 0,
  label: 'jknsxkjsdkj skjd vkjsd vkjsd vkjsd vskjd vksjd kjsd vkjs dvksmdkjkvnskjdnvsjkndkjsdjsndkjfnskjdfnskjdnfkjsndfkjsndfkjsndfjknsdkfjnsdjkf',
}

describe('progressLogCountLabel', () => {
  it('names the update count the same way as the table tooltip', () => {
    expect(progressLogCountLabel(0)).toBe('None yet')
    expect(progressLogCountLabel(1)).toBe('1 update')
    expect(progressLogCountLabel(2)).toBe('2 updates')
  })
})

describe('GoalProgressLog', () => {
  it('shows a metric change as from → to, not a completion icon', () => {
    render(<GoalProgressLog entries={[metricEntry]} />)

    fireEvent.click(screen.getByText('Log'))
    expect(
      screen.getByRole('heading', { name: 'Progress Logs 1 update' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        (_, node) =>
          node?.classList.contains('pd-goal-progress-log__change') === true &&
          node.textContent === '0 → 2',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Marked Completed')).not.toBeInTheDocument()
  })

  it('keeps numeric history when a metric log was stored with the measure title', () => {
    render(
      <GoalProgressLog
        kind="metric"
        entries={[
          {
            ...metricEntry,
            from: 40,
            to: 60,
            label: 'Operating metric versus baseline',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByText('Log'))
    expect(
      screen.getByRole('heading', { name: 'Progress Logs 1 update' }),
    ).toBeInTheDocument()
    const change = screen.getByText(
      (_, node) =>
        node?.classList.contains('pd-goal-progress-log__change') === true &&
        node.textContent === '40 → 60',
    )
    expect(change).toBeInTheDocument()
    expect(change.querySelector('strong')).toHaveTextContent('60')
    expect(change).not.toHaveTextContent('60 40')
    expect(
      screen.queryByText('Operating metric versus baseline'),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Marked Completed')).not.toBeInTheDocument()
  })

  it('uses a completion icon instead of the status wording', async () => {
    render(<GoalProgressLog entries={[completed, incomplete]} />)

    fireEvent.click(screen.getByText('Log'))
    expect(
      screen.getByRole('heading', { name: 'Progress Logs 2 updates' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Marked Completed')).not.toBeInTheDocument()
    expect(screen.queryByText('Marked Incomplete')).not.toBeInTheDocument()
    expect(screen.getByText('Task Item 001')).toBeInTheDocument()

    fireEvent.mouseEnter(
      screen.getByLabelText('Marked Completed').closest('.pd-tooltip')!,
    )
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Marked Completed',
    )

    fireEvent.mouseLeave(
      screen.getByLabelText('Marked Completed').closest('.pd-tooltip')!,
    )
    fireEvent.mouseEnter(
      screen.getByLabelText('Marked Incomplete').closest('.pd-tooltip')!,
    )
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Marked Incomplete',
    )
  })
})
