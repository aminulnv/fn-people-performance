import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialReviewsSnapshot } from './demoData'
import { buildPeriod, formatDateRange } from './periods'
import { resolveCycleStatus } from './status'
import {
  createReviewCycle,
  createTestCycle,
  deleteReviewCycle,
  getReviewCycle,
  resetReviewsStoreForTests,
  sortCyclesForList,
} from './store'

beforeEach(() => {
  resetReviewsStoreForTests()
})

describe('resolveCycleStatus', () => {
  it('marks ad-hoc cycles as manual', () => {
    expect(
      resolveCycleStatus(
        {
          type: 'ad-hoc',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        },
        new Date('2026-08-13'),
      ),
    ).toBe('manual')
  })

  it('classifies regular cycles by timeframe', () => {
    const today = new Date('2026-08-13')
    expect(
      resolveCycleStatus(
        { type: 'regular', startDate: '2026-07-01', endDate: '2026-09-30' },
        today,
      ),
    ).toBe('current')
    expect(
      resolveCycleStatus(
        { type: 'regular', startDate: '2027-01-01', endDate: '2027-03-31' },
        today,
      ),
    ).toBe('future')
    expect(
      resolveCycleStatus(
        { type: 'regular', startDate: '2026-01-01', endDate: '2026-03-31' },
        today,
      ),
    ).toBe('previous')
  })
})

describe('formatDateRange', () => {
  it('formats a quarter range with a shared year', () => {
    expect(formatDateRange('2027-01-01', '2027-03-31')).toBe(
      '1 Jan - 31 Mar 2027',
    )
  })
})

describe('reviews store', () => {
  it('seeds demo cycles and creates a regular cycle', () => {
    const seeded = createInitialReviewsSnapshot()
    expect(seeded.cycles.length).toBeGreaterThan(3)

    const period = buildPeriod(2028, 2)
    // Use unique period unlikely in seed
    const created = createReviewCycle({
      type: 'regular',
      periodKey: period.key,
    })
    expect(created.name).toBe('Q2 2028')
    expect(getReviewCycle(created.id)?.id).toBe(created.id)
  })

  it('creates a test cycle from an existing one', () => {
    const source = createReviewCycle({
      type: 'ad-hoc',
      name: 'Source',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
    })
    const test = createTestCycle(source.id)
    expect(test.isTest).toBe(true)
    expect(test.name).toContain('(Test)')
    expect(test.type).toBe('ad-hoc')
  })

  it('deletes a cycle', () => {
    const created = createReviewCycle({
      type: 'ad-hoc',
      name: 'To delete',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
    })
    deleteReviewCycle(created.id)
    expect(getReviewCycle(created.id)).toBeNull()
  })

  it('sorts cycles with current before previous', () => {
    const cycles = [
      {
        id: 'a',
        name: 'Prev',
        type: 'regular' as const,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      },
      {
        id: 'b',
        name: 'Current',
        type: 'regular' as const,
        startDate: '2026-07-01',
        endDate: '2026-09-30',
      },
    ]
    const sorted = sortCyclesForList(cycles as never, (c) =>
      resolveCycleStatus(c, new Date('2026-08-13')),
    )
    expect(sorted[0].id).toBe('b')
    expect(sorted[1].id).toBe('a')
  })
})
