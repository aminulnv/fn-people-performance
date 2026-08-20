/** Shared date/copy helpers for Home goal banners. */

const ORDINALS: Record<number, string> = {
  1: 'st',
  2: 'nd',
  3: 'rd',
}

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`)
}

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  return ORDINALS[day % 10] ?? 'th'
}

/** e.g. 2026-04-30 → "30th April 2026" */
export function formatGoalDeadlineLabel(deadline: string): string {
  const date = parseDate(deadline)
  const day = date.getUTCDate()
  const month = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  }).format(date)
  const year = date.getUTCFullYear()
  return `${day}${ordinalSuffix(day)} ${month} ${year}`
}

/** "Q3 2026" → "Q3" */
export function cycleQuarterLabel(cycleLabel: string): string {
  const match = cycleLabel.match(/\bQ[1-4]\b/i)
  if (match) return match[0].toUpperCase()
  const first = cycleLabel.trim().split(/\s+/)[0]
  return first || cycleLabel
}

export function buildGoalDeadlineHeadline(cycleLabel: string): string {
  return `Set your ${cycleQuarterLabel(cycleLabel)} Goals`
}

export function formatDaysRemainingLabel(daysRemaining: number): string {
  if (daysRemaining === 1) return '1 Day'
  return `${daysRemaining} Days`
}

export type GoalDeadlineUrgency = 'default' | 'warning' | 'critical'

/** Yellow at ≤5 days, red at <3 days (red wins when both apply). */
export function resolveGoalDeadlineUrgency(
  daysRemaining: number,
): GoalDeadlineUrgency {
  if (daysRemaining < 3) return 'critical'
  if (daysRemaining <= 5) return 'warning'
  return 'default'
}

export const GOAL_DEADLINE_URGENCY_GRADIENTS: Record<
  GoalDeadlineUrgency,
  { start: string; end: string; accent: string }
> = {
  default: { start: '#14163C', end: '#635CFF', accent: '#635CFF' },
  warning: { start: '#2F2508', end: '#E4A60A', accent: '#E4A60A' },
  critical: { start: '#290808', end: '#A7090C', accent: '#A7090C' },
}
