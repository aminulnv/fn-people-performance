import { describe, expect, it } from 'vitest'
import { describeReviewEditWindowLock } from './editWindow'
import type { ReviewStageConfig } from './types'

function localNoon(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12)
}

const stages: ReviewStageConfig[] = [
  {
    id: 'self_review',
    enabled: true,
    start: { date: '2026-06-01', time: '00:00' },
    end: { date: '2026-06-15', time: '00:00' },
  },
  {
    id: 'manager_review',
    enabled: true,
    start: { date: '2026-06-16', time: '00:00' },
    end: { date: '2026-06-30', time: '00:00' },
  },
]

describe('describeReviewEditWindowLock', () => {
  it('locks when the cycle end date has passed', () => {
    expect(
      describeReviewEditWindowLock({
        cycle: {
          name: 'Q2 2026',
          startDate: '2026-04-01',
          endDate: '2026-06-30',
        },
        stages,
        formStage: 'manager_review',
        today: localNoon(2026, 7, 1),
      }),
    ).toEqual({
      title: 'Read Only',
      message: 'This cycle ended on 30 Jun 2026. Reviews are read-only.',
    })
  })

  it('locks when the manager review window has closed', () => {
    expect(
      describeReviewEditWindowLock({
        cycle: {
          name: 'Q2 2026',
          startDate: '2026-04-01',
          endDate: '2026-08-31',
        },
        stages,
        formStage: 'manager_review',
        today: localNoon(2026, 7, 1),
      }),
    ).toEqual({
      title: 'Read Only',
      message:
        'The Manager Review window closed on 30 Jun 2026. This form is read-only.',
    })
  })

  it('stays open while the stage window is still active', () => {
    expect(
      describeReviewEditWindowLock({
        cycle: {
          name: 'Q2 2026',
          startDate: '2026-04-01',
          endDate: '2026-08-31',
        },
        stages,
        formStage: 'manager_review',
        today: localNoon(2026, 6, 30),
      }),
    ).toBeNull()
  })

  it('ignores non-form stages', () => {
    expect(
      describeReviewEditWindowLock({
        cycle: {
          name: 'Q2 2026',
          startDate: '2026-04-01',
          endDate: '2026-08-31',
        },
        stages,
        formStage: 'publish_employees',
        today: localNoon(2026, 7, 1),
      }),
    ).toBeNull()
  })
})
