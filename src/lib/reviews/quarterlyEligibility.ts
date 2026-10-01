import { cyclePurposeOf } from './purpose'
import type { ReviewCycle } from './types'

export type QuarterlyEligibilityReason = 'joined_on_or_after_day_25'

export type QuarterlyEligibilityResult = {
  eligible: boolean
  reason: QuarterlyEligibilityReason | null
  message: string | null
  /** First ineligible join date (day 25 of the quarter). */
  day25Date: string
  /** Last eligible join date (day 24). */
  lastEligibleDate: string
}

function dateOnly(value: string | null | undefined): string {
  return String(value ?? '').trim().slice(0, 10)
}

function addCalendarDays(dateOnlyValue: string, days: number): string | null {
  const [year, month, day] = dateOnlyValue.split('-').map(Number)
  if (!year || !month || !day) return null
  const next = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(next.getTime())) return null
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function formatDayMonthYear(dateOnlyValue: string): string {
  const [year, month, day] = dateOnlyValue.split('-').map(Number)
  if (!year || !month || !day) return dateOnlyValue
  const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' },
  )
  return label
}

/**
 * Day 25 of the quarter (YYYY-MM-DD). Join on this day or later → not eligible.
 * Master Doc: late joiner (joins Day 25) — not eligible; enrolled next quarter.
 */
export function quarterlyDay25Date(
  cycle: Pick<ReviewCycle, 'periodKey' | 'startDate' | 'type'> | null | undefined,
): string | null {
  if (!cycle || cyclePurposeOf(cycle) !== 'quarterly_checkin') return null
  const start = dateOnly(cycle.startDate)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null
  // Day 1 = startDate; day 25 = start + 24 calendar days.
  return addCalendarDays(start, 24)
}

export function quarterlyEligibilityMessage(day25Date: string): string {
  return `Joined on or after ${formatDayMonthYear(day25Date)} (day 25), so they’re not eligible for this quarter.`
}

export function quarterlyEligibilityForEmployee(input: {
  cycle: Pick<ReviewCycle, 'periodKey' | 'startDate' | 'type'> | null | undefined
  startDate: string | null | undefined
}): QuarterlyEligibilityResult | null {
  const day25Date = quarterlyDay25Date(input.cycle)
  if (!day25Date) return null
  const lastEligibleDate = addCalendarDays(day25Date, -1) ?? day25Date
  const start = dateOnly(input.startDate)
  if (start && start >= day25Date) {
    return {
      eligible: false,
      reason: 'joined_on_or_after_day_25',
      message: quarterlyEligibilityMessage(day25Date),
      day25Date,
      lastEligibleDate,
    }
  }
  return {
    eligible: true,
    reason: null,
    message: null,
    day25Date,
    lastEligibleDate,
  }
}
