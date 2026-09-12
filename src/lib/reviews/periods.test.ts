import { describe, expect, it } from 'vitest'
import {
  findPeriod,
  halfYearPeriodKey,
  listAppraisalPeriods,
  listPerformanceYears,
} from './periods'

describe('listPerformanceYears', () => {
  it('lists nearby years newest first and keeps years already in use', () => {
    expect(listPerformanceYears(['2019', 'not-a-year'], new Date('2026-08-27'))).toEqual([
      '2028',
      '2027',
      '2026',
      '2025',
      '2024',
      '2019',
    ])
  })
})

describe('half-year periods', () => {
  it('resolves H1 and H2 as distinct periods in the same year', () => {
    expect(findPeriod('h1-2025')).toEqual({
      key: 'h1-2025',
      label: 'H1 2025',
      startDate: '2025-01-01',
      endDate: '2025-06-30',
    })
    expect(findPeriod('h2-2025')).toEqual({
      key: 'h2-2025',
      label: 'H2 2025',
      startDate: '2025-07-01',
      endDate: '2025-12-31',
    })
    expect(findPeriod(halfYearPeriodKey(2025, 1))?.key).toBe('h1-2025')
  })

  it('lists next and current annual years, then the last biannual halves', () => {
    expect(listAppraisalPeriods(new Date('2026-09-11')).map((period) => period.key)).toEqual([
      'annual-2027',
      'annual-2026',
      'h2-2025',
      'h1-2025',
      'h2-2024',
      'h1-2024',
    ])
  })
})
