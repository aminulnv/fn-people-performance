import { describe, expect, it } from 'vitest'
import {
  formatProgressTimestamp,
  latestProgressAt,
  progressLogSummary,
  recordMetricProgress,
  recordMilestoneProgress,
} from './progressLog'
import type { Goal, Metric, Milestone } from './types'

const author = { id: 'p1', name: 'Ada Lovelace' }

const metric: Metric = {
  id: 'm1',
  kind: 'metric',
  title: 'Defects closed',
  weight: 100,
  unit: 'number',
  direction: 'increase',
  startValue: 0,
  targetValue: 80,
  currentValue: 10,
}

const todo: Milestone = {
  id: 't1',
  kind: 'milestone',
  title: 'Triage incoming defects',
  weight: 0,
  complete: false,
}

describe('recordMetricProgress', () => {
  it('appends a timestamped log when the current value changes', () => {
    const next = recordMetricProgress(
      metric,
      13,
      author,
      new Date('2026-08-16T09:10:00.000Z'),
    )

    expect(next.currentValue).toBe(13)
    expect(next.progressLog).toHaveLength(1)
    expect(next.progressLog?.[0]).toMatchObject({
      authorId: 'p1',
      authorName: 'Ada Lovelace',
      from: 10,
      to: 13,
      recordedAt: '2026-08-16T09:10:00.000Z',
    })
  })

  it('logs again when the same value is recorded', () => {
    const next = recordMetricProgress(
      metric,
      10,
      author,
      new Date('2026-08-16T11:00:00.000Z'),
    )

    expect(next).not.toBe(metric)
    expect(next.currentValue).toBe(10)
    expect(next.progressLog).toHaveLength(1)
    expect(next.progressLog?.[0]).toMatchObject({
      from: 10,
      to: 10,
      recordedAt: '2026-08-16T11:00:00.000Z',
    })
  })
})

describe('recordMilestoneProgress', () => {
  it('logs complete and incomplete with the task title', () => {
    const done = recordMilestoneProgress(todo, true, author)
    expect(done.complete).toBe(true)
    expect(progressLogSummary(done.progressLog![0])).toBe(
      'Marked Completed: Triage incoming defects',
    )
    expect(done.progressLog![0].to).toBe(1)

    const undone = recordMilestoneProgress(done, false, author)
    expect(progressLogSummary(undone.progressLog![1])).toBe(
      'Marked Incomplete: Triage incoming defects',
    )
    expect(undone.progressLog![1].to).toBe(0)
  })
})

describe('progressLogSummary / timestamps', () => {
  it('renders metric changes as from → to', () => {
    expect(
      progressLogSummary({
        id: '1',
        recordedAt: '2026-08-16T09:10:00.000Z',
        authorName: 'Ada',
        from: 10,
        to: 13,
      }),
    ).toBe('10 → 13')
  })

  it('formats a date without the time of day', () => {
    expect(formatProgressTimestamp('2026-08-16T09:10:00.000Z')).toBe(
      '16 Aug 2026',
    )
  })
})

describe('latestProgressAt', () => {
  it('returns the newest log across measurements', () => {
    const goal: Goal = {
      id: 'g1',
      description: 'Quality',
      weight: 100,
      measurements: [
        {
          ...metric,
          progressLog: [
            {
              id: 'a',
              recordedAt: '2026-08-01T00:00:00.000Z',
              authorName: 'Ada',
              to: 10,
            },
          ],
        },
        {
          ...todo,
          progressLog: [
            {
              id: 'b',
              recordedAt: '2026-08-10T00:00:00.000Z',
              authorName: 'Ada',
              to: 1,
              label: 'Triage incoming defects',
            },
          ],
        },
      ],
    }

    expect(latestProgressAt(goal)).toBe('2026-08-10T00:00:00.000Z')
  })
})
