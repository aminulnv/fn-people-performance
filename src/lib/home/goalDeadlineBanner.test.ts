import { describe, expect, it } from 'vitest'
import {
  buildClosedGoalHeadline,
  buildGoalDeadlineHeadline,
  cycleQuarterLabel,
  deadlineAriaSuffix,
  deadlineCountdownCopy,
  deadlineSublineEmphasis,
  deadlineSublinePrefix,
  formatDaysRemainingLabel,
  formatGoalDeadlineLabel,
  resolveGoalDeadlineTiming,
  resolveGoalDeadlineUrgency,
  signedDaysUntil,
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

  it('counts signed days so overdue dates stay negative', () => {
    expect(signedDaysUntil('2026-08-23', '2026-08-30')).toBe(7)
    expect(signedDaysUntil('2026-08-23', '2026-08-23')).toBe(0)
    expect(signedDaysUntil('2026-08-23', '2026-07-01')).toBe(-53)
  })

  it('classifies upcoming, due today, and overdue', () => {
    expect(resolveGoalDeadlineTiming(7)).toBe('upcoming')
    expect(resolveGoalDeadlineTiming(0)).toBe('due_today')
    expect(resolveGoalDeadlineTiming(-1)).toBe('overdue')
  })

  it('uses due-today and overdue copy instead of a zero countdown', () => {
    expect(deadlineCountdownCopy(4)).toEqual({
      primary: '4 Days',
      secondary: 'Remaining',
    })
    expect(deadlineCountdownCopy(0)).toEqual({
      primary: 'Due',
      secondary: 'Today',
    })
    expect(deadlineCountdownCopy(-12)).toEqual({
      primary: 'Overdue',
      secondary: '',
    })
    expect(deadlineSublinePrefix('upcoming')).toBe('Due by ')
    expect(deadlineSublinePrefix('due_today')).toBe('Due today')
    expect(deadlineSublinePrefix('overdue')).toBe('Was due ')
    expect(deadlineSublineEmphasis('due_today', '23rd August 2026')).toBeUndefined()
    expect(deadlineSublineEmphasis('overdue', '1st July 2026')).toBe(
      '1st July 2026',
    )
    expect(deadlineAriaSuffix(0, '23rd August 2026')).toBe('Due today.')
    expect(deadlineAriaSuffix(-53, '1st July 2026')).toBe(
      'Overdue, was due 1st July 2026.',
    )
    expect(buildClosedGoalHeadline('Q3 2026')).toBe(
      'Q3 Goal submission is closed',
    )
  })

  it('escalates goal-setting urgency by days remaining', () => {
    expect(resolveGoalDeadlineUrgency(11)).toBe('default')
    expect(resolveGoalDeadlineUrgency(6)).toBe('default')
    expect(resolveGoalDeadlineUrgency(5)).toBe('warning')
    expect(resolveGoalDeadlineUrgency(3)).toBe('warning')
    expect(resolveGoalDeadlineUrgency(2)).toBe('critical')
    expect(resolveGoalDeadlineUrgency(0)).toBe('critical')
    expect(resolveGoalDeadlineUrgency(-20)).toBe('critical')
  })
})
