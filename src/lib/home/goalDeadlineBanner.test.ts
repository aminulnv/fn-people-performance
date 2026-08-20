import { describe, expect, it } from 'vitest'
import {
  buildGoalDeadlineHeadline,
  cycleQuarterLabel,
  formatDaysRemainingLabel,
  formatGoalDeadlineLabel,
  resolveGoalDeadlineUrgency,
} from './goalDeadlineBanner'

describe('goalDeadlineBanner copy helpers', () => {
  it('formats deadlines with ordinal days', () => {
    expect(formatGoalDeadlineLabel('2026-04-30')).toBe('30th April 2026')
    expect(formatGoalDeadlineLabel('2026-07-01')).toBe('1st July 2026')
    expect(formatGoalDeadlineLabel('2026-07-02')).toBe('2nd July 2026')
    expect(formatGoalDeadlineLabel('2026-07-03')).toBe('3rd July 2026')
    expect(formatGoalDeadlineLabel('2026-07-11')).toBe('11th July 2026')
  })

  it('extracts quarter labels from cycle names', () => {
    expect(cycleQuarterLabel('Q3 2026')).toBe('Q3')
    expect(cycleQuarterLabel('Quarter Q4 2027')).toBe('Q4')
  })

  it('builds the headline from the cycle label', () => {
    expect(buildGoalDeadlineHeadline('Q3 2026')).toBe('Set your Q3 Goals')
  })

  it('pluralises the countdown label', () => {
    expect(formatDaysRemainingLabel(11)).toBe('11 Days')
    expect(formatDaysRemainingLabel(1)).toBe('1 Day')
    expect(formatDaysRemainingLabel(0)).toBe('0 Days')
  })

  it('escalates goal-setting urgency by days remaining', () => {
    expect(resolveGoalDeadlineUrgency(11)).toBe('default')
    expect(resolveGoalDeadlineUrgency(6)).toBe('default')
    expect(resolveGoalDeadlineUrgency(5)).toBe('warning')
    expect(resolveGoalDeadlineUrgency(3)).toBe('warning')
    expect(resolveGoalDeadlineUrgency(2)).toBe('critical')
    expect(resolveGoalDeadlineUrgency(0)).toBe('critical')
  })
})
