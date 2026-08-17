import {
  getGoalsSnapshot,
  getGoalsSnapshotForCycle,
} from '@/lib/goals/store'
import { resolveGoalDeadline } from '@/lib/goals/goalExtensions'
import type { GoalsCycle, PersonGoals } from '@/lib/goals/types'
import { listReviewCycles } from '@/lib/reviews/store'
import { NOTIFICATION_EVENTS } from './catalogue'
import {
  emitNotification,
  supersedeNotification,
} from './store'

type ReminderPoint = {
  day: 7 | 14 | 25
  eventKey: string
}

const GOAL_REMINDER_POINTS: ReminderPoint[] = [
  { day: 7, eventKey: NOTIFICATION_EVENTS.GOAL_DAY_7_REMINDER },
  { day: 14, eventKey: NOTIFICATION_EVENTS.GOAL_DAY_14_REMINDER },
  { day: 25, eventKey: NOTIFICATION_EVENTS.GOAL_DAY_25_REMINDER },
]

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`)
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function addDays(value: string, days: number): string {
  const date = parseDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return dateKey(date)
}

function daysBetween(from: string, to: string): number {
  return Math.max(
    0,
    Math.ceil((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000),
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDate(value))
}

function goalDestination(cycleId: string, personId: string): string {
  return `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
}

function reminderDedupeKey(
  cycleId: string,
  personId: string,
  day: number,
): string {
  return `goal-reminder:${cycleId}:${personId}:day-${day}`
}

function latestReminderPoint(
  startDate: string,
  endDate: string,
  today: string,
): ReminderPoint | null {
  return (
    [...GOAL_REMINDER_POINTS]
      .reverse()
      .find((point) => {
        const scheduled = addDays(startDate, point.day - 1)
        return scheduled <= today && scheduled <= endDate
      }) ?? null
  )
}

function latestProgressTimestamp(row: PersonGoals): string | null {
  const timestamps = row.goals.flatMap((goal) => [
    ...(goal.updatedAt ? [goal.updatedAt] : []),
    ...goal.measurements.flatMap((measurement) =>
      (measurement.progressLog ?? []).map((entry) => entry.recordedAt),
    ),
  ])
  const sorted = timestamps.sort()
  return sorted[sorted.length - 1] ?? null
}

function evaluateEmployeeGoalReminders(
  cycle: GoalsCycle,
  row: PersonGoals,
  recipientId: string,
  today: string,
): void {
  const snapshot = getGoalsSnapshot()
  const employee = snapshot.people.find((person) => person.id === recipientId)
  const baseWindow = cycle.goalWindow
  if (!baseWindow || today < baseWindow.startDate) return
  const window = {
    ...baseWindow,
    endDate: employee
      ? (resolveGoalDeadline(cycle, employee) ?? baseWindow.endDate)
      : baseWindow.endDate,
  }
  const destination = goalDestination(cycle.id, recipientId)
  const isPending = row.status === 'draft' || row.status === 'sent_back'

  if (today <= window.endDate) {
    emitNotification({
      eventKey: NOTIFICATION_EVENTS.GOAL_WINDOW_OPENED,
      recipientId,
      dedupeKey: `goal-window-opened:${cycle.id}:${recipientId}`,
      destination,
      cycleId: cycle.id,
      personId: recipientId,
      dueAt: window.endDate,
      variables: {
        cycle: cycle.label,
        deadline: formatDate(window.endDate),
      },
    })

    if (!isPending) return
    const reminder = latestReminderPoint(
      window.startDate,
      window.endDate,
      today,
    )
    if (!reminder) return
    for (const point of GOAL_REMINDER_POINTS) {
      if (point.day >= reminder.day) continue
      supersedeNotification(
        recipientId,
        reminderDedupeKey(cycle.id, recipientId, point.day),
      )
    }
    emitNotification({
      eventKey: reminder.eventKey,
      recipientId,
      dedupeKey: reminderDedupeKey(cycle.id, recipientId, reminder.day),
      destination,
      cycleId: cycle.id,
      personId: recipientId,
      dueAt: window.endDate,
      variables: {
        cycle: cycle.label,
        deadline: formatDate(window.endDate),
        days: daysBetween(today, window.endDate),
      },
      metadata: { cadenceDay: reminder.day },
    })
    return
  }

  if (!isPending && row.status !== 'incomplete') return
  const people = snapshot.people
  const manager = people.find((person) => person.id === employee?.managerId)
  const skipLevelManager = people.find(
    (person) => person.id === manager?.managerId,
  )
  emitNotification({
    eventKey:
      cycle.postWindowGoalPolicy === 'two_tier_approval'
        ? NOTIFICATION_EVENTS.GOAL_DEADLINE_PASSED_EXCEPTIONS
        : NOTIFICATION_EVENTS.GOAL_DEADLINE_CLOSED,
    recipientId,
    dedupeKey: `goal-deadline:${cycle.id}:${recipientId}`,
    destination,
    cycleId: cycle.id,
    personId: recipientId,
    variables: {
      cycle: cycle.label,
      deadline: formatDate(window.endDate),
      manager: manager?.name ?? 'your manager',
      skipLevelManager: skipLevelManager?.name ?? 'your skip-level manager',
    },
  })
}

function evaluateResultsReminder(
  cycle: GoalsCycle,
  row: PersonGoals,
  recipientId: string,
  today: string,
): void {
  const reviewCycle = listReviewCycles().find((item) => item.id === cycle.id)
  if (!reviewCycle || today > reviewCycle.endDate) return
  const reminderStart = addDays(reviewCycle.endDate, -14)
  if (today < reminderStart) return
  if (row.status !== 'approved' && row.status !== 'submitted') return

  const latestProgress = latestProgressTimestamp(row)
  if (latestProgress && latestProgress.slice(0, 10) >= reminderStart) return

  emitNotification({
    eventKey: NOTIFICATION_EVENTS.GOAL_RESULTS_REMINDER,
    recipientId,
    dedupeKey: `goal-results-reminder:${cycle.id}:${recipientId}`,
    destination: goalDestination(cycle.id, recipientId),
    cycleId: cycle.id,
    personId: recipientId,
    dueAt: reviewCycle.endDate,
    variables: {
      cycle: cycle.label,
      deadline: formatDate(reviewCycle.endDate),
    },
  })
}

function evaluateManagerSummary(
  cycle: GoalsCycle,
  managerId: string,
): void {
  const snapshot = getGoalsSnapshotForCycle(cycle.id)
  const manager = snapshot.people.find((person) => person.id === managerId)
  if (!manager || manager.reportIds.length === 0) return
  const pending = manager.reportIds.filter((id) => {
    const status = snapshot.byPerson[id]?.status
    return status === 'draft' || status === 'sent_back' || status === 'incomplete'
  })
  const dedupeKey = `goal-team-pending:${cycle.id}:${managerId}`
  if (pending.length === 0) {
    supersedeNotification(managerId, dedupeKey)
    return
  }
  emitNotification(
    {
      eventKey: NOTIFICATION_EVENTS.GOAL_TEAM_PENDING_SUMMARY,
      recipientId: managerId,
      dedupeKey,
      destination: goalDestination(cycle.id, managerId),
      cycleId: cycle.id,
      personId: managerId,
      variables: { count: pending.length, cycle: cycle.label },
      metadata: { pendingCount: pending.length },
    },
    { duplicate: 'refresh' },
  )
}

/**
 * Catch-up evaluator for the local workflow. A server scheduler can call the
 * same catalogue later; this only emits the latest eligible cadence point, so
 * opening the app after several missed dates never floods the feed.
 */
export function evaluateNotificationReminders(
  recipientId: string,
  now = new Date(),
): void {
  const root = getGoalsSnapshot()
  const today = dateKey(now)
  for (const cycle of root.availableCycles) {
    if (cycle.status === 'future' || cycle.status === 'previous') continue
    const snapshot = getGoalsSnapshotForCycle(cycle.id)
    const person = snapshot.people.find((item) => item.id === recipientId)
    const row = snapshot.byPerson[recipientId]
    if (!person || !row || person.joinDate > cycle.day1) continue
    evaluateEmployeeGoalReminders(cycle, row, recipientId, today)
    evaluateResultsReminder(cycle, row, recipientId, today)
    evaluateManagerSummary(cycle, recipientId)
  }
}
