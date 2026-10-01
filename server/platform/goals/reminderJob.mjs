import { getPool } from '../../db.mjs'
import { resolveEffectiveGoalDeadline } from './deadline.mjs'
import {
  emitRuleNotification,
  supersedeNotification,
} from '../notifications/emitFromRule.mjs'

const GOAL_REMINDER_POINTS = [
  { day: 7, eventKey: 'goal.reminder.day_7' },
  { day: 14, eventKey: 'goal.reminder.day_14' },
  { day: 25, eventKey: 'goal.reminder.day_25' },
]

const RESULTS_REMINDER_DAYS = 14

function datePart(value) {
  if (!value) return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  return text.slice(0, 10)
}

function parseDate(value) {
  return new Date(`${datePart(value)}T12:00:00.000Z`)
}

function addDays(value, days) {
  const date = parseDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysBetween(from, to) {
  return Math.max(
    0,
    Math.ceil((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000),
  )
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDate(value))
}

function goalDestination(cycleId, personId) {
  return `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
}

function reminderDedupeKey(cycleId, personId, day) {
  return `goal-reminder:${cycleId}:${personId}:day-${day}`
}

function latestReminderPoint(startDate, endDate, today) {
  return (
    [...GOAL_REMINDER_POINTS]
      .reverse()
      .find((point) => {
        const scheduled = addDays(startDate, point.day - 1)
        return scheduled <= today && scheduled <= endDate
      }) ?? null
  )
}

/**
 * Day 7/14/25 reminders, window-opened notice, and last-14-days results nudge.
 * Deadline escalation + incomplete live in incompleteJob.mjs.
 */
export async function runGoalReminderJob({ today = new Date() } = {}) {
  const todayKey = datePart(today)
  const client = await getPool().connect()
  const summary = { windowOpened: 0, cadence: 0, results: 0 }
  try {
    await client.query('BEGIN')
    const { rows: groups } = await client.query(
      `SELECT
         c.id AS cycle_id,
         c.name AS cycle_name,
         c.start_date,
         c.end_date,
         g.id AS group_id,
         g.stages_config
       FROM platform.review_cycles c
       INNER JOIN platform.review_cycle_groups g ON g.cycle_id = c.id
       WHERE c.deleted_at IS NULL
         AND g.deleted_at IS NULL`,
    )

    for (const group of groups) {
      const stages = group.stages_config
      const windowStart = datePart(stages?.goals?.employee?.startDate)
      const baseEnd = datePart(stages?.goals?.employee?.endDate)
      if (!windowStart || todayKey < windowStart) continue

      const { rows: members } = await client.query(
        `SELECT
           e.employee_id,
           e.department_id,
           e.team_id,
           e.join_date,
           COALESCE(s.status, 'draft') AS status
         FROM platform.review_cycle_group_members gm
         INNER JOIN platform.employees e ON e.employee_id = gm.employee_id
         LEFT JOIN platform.goal_submissions s
           ON s.cycle_id = $1 AND s.employee_id = e.employee_id
         WHERE gm.group_id = $2
           AND e.status = 'active'`,
        [group.cycle_id, group.group_id],
      )

      for (const member of members) {
        const joinDate = datePart(member.join_date)
        const cycleDay1 = datePart(group.start_date)
        if (joinDate && cycleDay1 && joinDate > cycleDay1) continue

        const windowEnd =
          datePart(
            resolveEffectiveGoalDeadline(stages, {
              employeeId: member.employee_id,
              departmentId: member.department_id,
              teamId: member.team_id,
            }),
          ) || baseEnd
        if (!windowEnd) continue

        const destination = goalDestination(
          group.cycle_id,
          member.employee_id,
        )
        const isPending =
          member.status === 'draft' || member.status === 'sent_back'

        if (todayKey <= windowEnd) {
          await emitRuleNotification(client, {
            eventKey: 'goal.window_opened',
            recipientEmployeeId: member.employee_id,
            dedupeKey: `goal-window-opened:${group.cycle_id}:${member.employee_id}`,
            destination,
            cycleId: group.cycle_id,
            personId: member.employee_id,
            dueAt: windowEnd,
            variables: {
              cycle: group.cycle_name,
              deadline: formatDate(windowEnd),
            },
          })
          summary.windowOpened += 1

          if (!isPending) continue
          const reminder = latestReminderPoint(
            windowStart,
            windowEnd,
            todayKey,
          )
          if (!reminder) continue
          for (const point of GOAL_REMINDER_POINTS) {
            if (point.day >= reminder.day) continue
            await supersedeNotification(
              client,
              member.employee_id,
              reminderDedupeKey(group.cycle_id, member.employee_id, point.day),
            )
          }
          await emitRuleNotification(client, {
            eventKey: reminder.eventKey,
            recipientEmployeeId: member.employee_id,
            dedupeKey: reminderDedupeKey(
              group.cycle_id,
              member.employee_id,
              reminder.day,
            ),
            destination,
            cycleId: group.cycle_id,
            personId: member.employee_id,
            dueAt: windowEnd,
            variables: {
              cycle: group.cycle_name,
              deadline: formatDate(windowEnd),
              days: daysBetween(todayKey, windowEnd),
            },
            metadata: { cadenceDay: reminder.day },
          })
          summary.cadence += 1
          continue
        }

        // Results reminder: last N days of cycle, for people with submitted/approved goals.
        const cycleEnd = datePart(group.end_date)
        if (!cycleEnd || todayKey > cycleEnd) continue
        const resultsStart = addDays(cycleEnd, -RESULTS_REMINDER_DAYS)
        if (todayKey < resultsStart) continue
        if (member.status !== 'approved' && member.status !== 'submitted') {
          continue
        }
        await emitRuleNotification(client, {
          eventKey: 'goal.results_reminder',
          recipientEmployeeId: member.employee_id,
          dedupeKey: `goal-results-reminder:${group.cycle_id}:${member.employee_id}`,
          destination,
          cycleId: group.cycle_id,
          personId: member.employee_id,
          dueAt: cycleEnd,
          variables: {
            cycle: group.cycle_name,
            deadline: formatDate(cycleEnd),
          },
        })
        summary.results += 1
      }
    }

    await client.query('COMMIT')
    return summary
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
