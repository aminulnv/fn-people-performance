import { describe, expect, it } from 'vitest'
import { formatInputDate } from './inputDate'

describe('formatInputDate', () => {
  it('formats an ISO calendar day as DD-MMM-YYYY', () => {
    expect(formatInputDate('2027-03-05')).toBe('05-Mar-2027')
  })

  it('keeps a two-digit day for single-digit dates', () => {
    expect(formatInputDate('2026-01-09')).toBe('09-Jan-2026')
  })

  it('returns empty when the value is not an ISO calendar day', () => {
    expect(formatInputDate('')).toBe('')
    expect(formatInputDate('05/03/2027')).toBe('')
    expect(formatInputDate('not-a-date')).toBe('')
  })

  it('reads the calendar day from a timestamp', () => {
    expect(formatInputDate('2027-03-05T10:00')).toBe('05-Mar-2027')
  })
})
