import { listEmployees } from '@/lib/employees/store'
import { buildScorecardsForCycle } from '@/lib/reviews/scorecards'
import { listReviewCycles } from '@/lib/reviews/store'
import type { DemoPerson } from '@/lib/goals/types'
import { NOTIFICATION_EVENTS } from './catalogue'
import { emitNotification, supersedeNotification } from './store'

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`)
}

function daysBetween(from: string, to: string): number {
  return Math.ceil(
    (parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000,
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

/** Prototype reminders for line-manager check-ins only. */
export function evaluateReviewNotifications(
  recipient: DemoPerson,
  now = new Date(),
): void {
  const today = dateKey(now)
  const employeeId = Number(recipient.id)
  const employees = listEmployees()

  for (const cycle of listReviewCycles()) {
    const managerStart = cycle.stagesConfig.performance.managerStart.date
    const managerEnd = cycle.stagesConfig.performance.managerEnd.date
    const rows = buildScorecardsForCycle(cycle.id, employees, recipient.email)
    const managed = rows.filter((row) => row.reviewerId === employeeId)
    const assigned = managed.filter((row) => row.status !== 'completed')
    const managerTaskKey = `review-manager:${cycle.id}:${recipient.id}`

    if (
      assigned.length > 0 &&
      managerStart <= today &&
      today <= managerEnd
    ) {
      emitNotification({
        eventKey: NOTIFICATION_EVENTS.REVIEW_MANAGER_OPENED,
        recipientId: recipient.id,
        dedupeKey: managerTaskKey,
        destination: '/reviews/scorecards',
        cycleId: cycle.id,
        dueAt: managerEnd,
        variables: {
          count: assigned.length,
          cycle: cycle.name,
          deadline: formatDate(managerEnd),
        },
        metadata: { outstandingCount: assigned.length },
      })

      const remainingDays = daysBetween(today, managerEnd)
      if (remainingDays <= 3) {
        emitNotification(
          {
            eventKey: NOTIFICATION_EVENTS.REVIEW_DUE_SOON,
            recipientId: recipient.id,
            dedupeKey: `review-reminder:${cycle.id}:${recipient.id}:due-soon`,
            destination: '/reviews/scorecards',
            cycleId: cycle.id,
            dueAt: managerEnd,
            variables: {
              days: Math.max(0, remainingDays),
              employee:
                assigned.length === 1
                  ? assigned[0].employeeName
                  : `${assigned.length} employees`,
              deadline: formatDate(managerEnd),
            },
          },
          { duplicate: 'refresh' },
        )
      }
    } else if (assigned.length === 0) {
      supersedeNotification(recipient.id, managerTaskKey)
    }

    if (assigned.length > 0 && today > managerEnd) {
      emitNotification(
        {
          eventKey: NOTIFICATION_EVENTS.REVIEW_OVERDUE,
          recipientId: recipient.id,
          dedupeKey: `review-reminder:${cycle.id}:${recipient.id}:overdue`,
          destination: '/reviews/scorecards',
          cycleId: cycle.id,
          variables: {
            employee:
              assigned.length === 1
                ? assigned[0].employeeName
                : `${assigned.length} employees`,
            cycle: cycle.name,
          },
          metadata: { outstandingCount: assigned.length },
        },
        { duplicate: 'refresh' },
      )
    }
  }
}
