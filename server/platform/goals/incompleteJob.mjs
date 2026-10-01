import { appendActivityEvent } from '../activity.mjs'
import { getPool } from '../../db.mjs'
import { resolveEffectiveGoalDeadline } from './deadline.mjs'
import { emitRuleNotification } from '../notifications/emitFromRule.mjs'
import {
  listWriteAllAdminEmployeeIds,
} from '../notifications/goalNotifications.mjs'

function datePart(value) {
  if (!value) return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  return text.slice(0, 10)
}

function formatDate(value) {
  if (!value) return 'the deadline'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${datePart(value)}T12:00:00.000Z`))
}

function goalDestination(cycleId, personId) {
  return `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
}

/**
 * Flip still-open drafts to incomplete when hard_stop deadline has passed.
 * Also notifies the employee + manager line + PTR admins (escalation).
 */
export async function applyHardLockIncompletes({ today = new Date() } = {}) {
  const todayKey = datePart(today)
  const client = await getPool().connect()
  const summary = {
    markedIncomplete: 0,
    escalations: 0,
    notifiedEmployees: 0,
  }
  try {
    await client.query('BEGIN')
    const { rows: cycles } = await client.query(
      `SELECT
         c.id,
         c.name,
         c.start_date,
         g.id AS group_id,
         g.stages_config,
         COALESCE(g.post_window_goal_policy, 'two_tier_approval')
           AS post_window_policy
       FROM platform.review_cycles c
       INNER JOIN platform.review_cycle_groups g ON g.cycle_id = c.id
       WHERE c.deleted_at IS NULL
         AND g.deleted_at IS NULL`,
    )

    const admins = await listWriteAllAdminEmployeeIds(client)

    for (const cycle of cycles) {
      const stages = cycle.stages_config
      const baseEnd = datePart(stages?.goals?.employee?.endDate)
      if (!baseEnd || baseEnd >= todayKey) {
        // Still may have extensions — check per person below when policy hard_stop.
      }
      const policy = cycle.post_window_policy || 'two_tier_approval'

      const { rows: members } = await client.query(
        `SELECT
           e.employee_id,
           e.name,
           e.department_id,
           e.team_id,
           e.reports_to_employee_id,
           e.join_date,
           s.status,
           s.post_window_approval_stage,
           m.name AS manager_name,
           m.reports_to_employee_id AS skip_level_id,
           skip.name AS skip_level_name
         FROM platform.review_cycle_group_members gm
         INNER JOIN platform.employees e
           ON e.employee_id = gm.employee_id
         LEFT JOIN platform.goal_submissions s
           ON s.cycle_id = $1 AND s.employee_id = e.employee_id
         LEFT JOIN platform.employees m
           ON m.employee_id = e.reports_to_employee_id
         LEFT JOIN platform.employees skip
           ON skip.employee_id = m.reports_to_employee_id
         WHERE gm.group_id = $2
           AND e.status = 'active'`,
        [cycle.id, cycle.group_id],
      )

      const pendingAfterDeadline = []

      for (const member of members) {
        const joinDate = datePart(member.join_date)
        const cycleDay1 = datePart(cycle.start_date)
        if (joinDate && cycleDay1 && joinDate > cycleDay1) continue

        const deadline = datePart(
          resolveEffectiveGoalDeadline(stages, {
            employeeId: member.employee_id,
            departmentId: member.department_id,
            teamId: member.team_id,
          }),
        )
        if (!deadline || deadline >= todayKey) continue

        const status = member.status ?? 'draft'
        const isOpen =
          status === 'draft' ||
          status === 'sent_back' ||
          status === 'incomplete' ||
          status === 'submitted'

        if (!isOpen && status !== 'submitted') continue

        // Escalation audience: still not approved past deadline.
        if (status !== 'approved') {
          pendingAfterDeadline.push(member)
        }

        // Incomplete flip only for hard_stop + draft/sent_back.
        if (
          policy === 'hard_stop' &&
          (status === 'draft' || status === 'sent_back')
        ) {
          await client.query(
            `INSERT INTO platform.goal_submissions (
               cycle_id, employee_id, status, version
             ) VALUES ($1, $2, 'incomplete', 1)
             ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
               status = 'incomplete',
               post_window_approval_stage = NULL,
               version = platform.goal_submissions.version + 1,
               updated_at = now()
             WHERE platform.goal_submissions.status IN ('draft', 'sent_back')`,
            [cycle.id, member.employee_id],
          )
          await appendActivityEvent(client, {
            eventKey: 'goal_submission.marked_incomplete',
            entityType: 'goal_submission',
            entityId: `${cycle.id}:${member.employee_id}`,
            actorEmployeeId: null,
            actorName: 'System',
            actorType: 'system',
            subjectEmployeeId: member.employee_id,
            cycleId: cycle.id,
            summary: 'Marked goals incomplete after the deadline',
            changes: [{ field: 'status', from: status, to: 'incomplete' }],
            source: 'system',
          })
          summary.markedIncomplete += 1

          await emitRuleNotification(client, {
            eventKey: 'goal.deadline.closed',
            recipientEmployeeId: member.employee_id,
            dedupeKey: `goal-deadline-closed:${cycle.id}:${member.employee_id}`,
            destination: goalDestination(cycle.id, member.employee_id),
            cycleId: cycle.id,
            personId: member.employee_id,
            variables: {
              cycle: cycle.name,
              deadline: formatDate(deadline),
            },
          })
          summary.notifiedEmployees += 1
        } else if (
          status === 'draft' ||
          status === 'sent_back' ||
          status === 'incomplete'
        ) {
          // two_tier: notify employee that deadline passed but late still open.
          await emitRuleNotification(client, {
            eventKey:
              policy === 'two_tier_approval'
                ? 'goal.deadline.exceptions'
                : 'goal.deadline.closed',
            recipientEmployeeId: member.employee_id,
            dedupeKey: `goal-deadline:${cycle.id}:${member.employee_id}`,
            destination: goalDestination(cycle.id, member.employee_id),
            cycleId: cycle.id,
            personId: member.employee_id,
            variables: {
              cycle: cycle.name,
              deadline: formatDate(deadline),
              manager: member.manager_name ?? 'your manager',
              skipLevelManager:
                member.skip_level_name ?? 'your skip-level manager',
            },
          })
          summary.notifiedEmployees += 1
        }
      }

      if (pendingAfterDeadline.length === 0) continue

      // Manager + skip-level summaries (plus-one / plus-two).
      const byManager = new Map()
      for (const member of pendingAfterDeadline) {
        const managerId = Number(member.reports_to_employee_id)
        if (!Number.isInteger(managerId)) continue
        if (!byManager.has(managerId)) byManager.set(managerId, [])
        byManager.get(managerId).push(member)
      }
      for (const [managerId, people] of byManager) {
        await emitRuleNotification(client, {
          eventKey: 'goal.team.pending_summary',
          recipientEmployeeId: managerId,
          dedupeKey: `goal-team-pending:${cycle.id}:${managerId}`,
          destination: goalDestination(cycle.id, managerId),
          cycleId: cycle.id,
          personId: managerId,
          variables: {
            count: people.length,
            cycle: cycle.name,
          },
          metadata: { pendingCount: people.length, escalation: true },
        })
        const skipId = Number(people[0]?.skip_level_id)
        if (Number.isInteger(skipId) && skipId > 0) {
          await emitRuleNotification(client, {
            eventKey: 'goal.team.pending_summary',
            recipientEmployeeId: skipId,
            dedupeKey: `goal-team-pending-skip:${cycle.id}:${managerId}`,
            destination: goalDestination(cycle.id, managerId),
            cycleId: cycle.id,
            personId: managerId,
            variables: {
              count: people.length,
              cycle: cycle.name,
            },
            metadata: {
              pendingCount: people.length,
              escalation: true,
              skipLevel: true,
            },
          })
        }
        summary.escalations += 1
      }

      // PTR admins
      for (const adminId of admins) {
        await emitRuleNotification(client, {
          eventKey: 'goal.team.pending_summary',
          recipientEmployeeId: adminId,
          dedupeKey: `goal-deadline-ptr:${cycle.id}:${adminId}`,
          destination: `/goals/${encodeURIComponent(cycle.id)}`,
          cycleId: cycle.id,
          variables: {
            count: pendingAfterDeadline.length,
            cycle: cycle.name,
          },
          metadata: {
            pendingCount: pendingAfterDeadline.length,
            escalation: true,
            ptr: true,
          },
        })
      }
      if (admins.length) summary.escalations += 1
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
