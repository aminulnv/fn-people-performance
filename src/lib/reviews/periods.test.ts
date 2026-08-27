import { describe, expect, it } from 'vitest'
import { listPerformanceYears } from './periods'

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
