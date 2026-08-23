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

export type GoalDeadlineTiming = 'upcoming' | 'due_today' | 'overdue'

export function signedDaysUntil(todayKey: string, deadline: string): number {
  return Math.ceil(
    (parseDate(deadline).getTime() - parseDate(todayKey).getTime()) / 86_400_000,
  )
}

export function resolveGoalDeadlineTiming(
  signedDays: number,
): GoalDeadlineTiming {
  if (signedDays < 0) return 'overdue'
  if (signedDays === 0) return 'due_today'
  return 'upcoming'
}

export function formatDaysRemainingLabel(daysRemaining: number): string {
  const remaining = Math.max(0, daysRemaining)
  if (remaining === 1) return '1 Day'
  return `${remaining} Days`
}

export function deadlineSublinePrefix(timing: GoalDeadlineTiming): string {
  if (timing === 'overdue') return 'Was due '
  if (timing === 'due_today') return 'Due today'
  return 'Due by '
}

export function deadlineSublineEmphasis(
  timing: GoalDeadlineTiming,
  deadlineLabel: string,
): string | undefined {
  return timing === 'due_today' ? undefined : deadlineLabel
}

export function deadlineCountdownCopy(signedDays: number): {
  primary: string
  secondary: string
} {
  const timing = resolveGoalDeadlineTiming(signedDays)
  if (timing === 'overdue') return { primary: 'Overdue', secondary: '' }
  if (timing === 'due_today') return { primary: 'Due', secondary: 'Today' }
  return {
    primary: formatDaysRemainingLabel(signedDays),
    secondary: 'Remaining',
  }
}

export function deadlineAriaSuffix(
  signedDays: number,
  deadlineLabel: string,
): string {
  const timing = resolveGoalDeadlineTiming(signedDays)
  if (timing === 'overdue') return `Overdue, was due ${deadlineLabel}.`
  if (timing === 'due_today') return 'Due today.'
  return `${formatDaysRemainingLabel(signedDays)} remaining, due by ${deadlineLabel}.`
}

export function buildClosedGoalHeadline(cycleLabel: string): string {
  return `${cycleQuarterLabel(cycleLabel)} Goal submission is closed`
}

export type GoalDeadlineUrgency = 'default' | 'warning' | 'critical'

/** Yellow at ≤5 days, red at <3 days — including due today and overdue. */
export function resolveGoalDeadlineUrgency(
  signedDays: number,
): GoalDeadlineUrgency {
  if (signedDays < 3) return 'critical'
  if (signedDays <= 5) return 'warning'
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
