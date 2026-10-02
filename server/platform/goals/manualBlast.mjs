import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { resolveEffectiveGoalDeadline } from './deadline.mjs'
import { restrictBroadcastRecipients } from '../notifications/broadcastGuard.mjs'
import { emitRuleNotification } from '../notifications/emitFromRule.mjs'
import { assertGoalAccess } from './policy.mjs'

function datePart(value) {
  if (!value) return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  return text.slice(0, 10)
}

function formatDate(value) {
  if (!value) return ''
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
 * PTR/manager blast: remind only people who have not submitted (draft/sent_back/incomplete).
 */
export async function sendManualGoalReminders(
  cycleId,
  {
    employeeIds,
    message,
    platformUser,
  },
) {
  const ids = [...new Set((employeeIds ?? []).map((id) => Number(id)))].filter(
    (id) => Number.isInteger(id) && id > 0,
  )
  if (ids.length === 0) {
    throw new HttpError(400, 'Select at least one person who has not submitted.')
  }

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows: cycleRows } = await client.query(
      `SELECT id, name FROM platform.review_cycles WHERE id = $1`,
      [cycleId],
    )
    if (!cycleRows[0]) throw new HttpError(404, 'Cycle not found')
    const cycleName = cycleRows[0].name

    const { rows: people } = await client.query(
      `SELECT
         e.employee_id,
         e.name,
         e.department_id,
         e.team_id,
         COALESCE(s.status, 'draft') AS status,
         g.stages_config
       FROM platform.employees e
       LEFT JOIN platform.goal_submissions s
         ON s.cycle_id = $1 AND s.employee_id = e.employee_id
       LEFT JOIN platform.review_cycle_group_members gm
         ON gm.cycle_id = $1 AND gm.employee_id = e.employee_id
       LEFT JOIN platform.review_cycle_groups g ON g.id = gm.group_id
       WHERE e.employee_id = ANY($2::int[])`,
      [cycleId, ids],
    )

    const eligible = []
    for (const person of people) {
      if (!['draft', 'sent_back', 'incomplete'].includes(person.status)) {
        continue
      }
      await assertGoalAccess(platformUser, {
        action: 'read',
        cycleId,
        subjectEmployeeId: person.employee_id,
      })
      eligible.push(person)
    }

    if (eligible.length === 0) {
      throw new HttpError(
        400,
        'None of the selected people still need to submit goals.',
      )
    }

    const allowedIds = new Set(
      await restrictBroadcastRecipients(
        client,
        eligible.map((person) => person.employee_id),
      ),
    )
    const recipients = eligible.filter((person) =>
      allowedIds.has(Number(person.employee_id)),
    )
    if (recipients.length === 0) {
      throw new HttpError(
        403,
        'Broadcast is restricted outside production. Add recipients to PLATFORM_DEVELOPER_EMAILS to test.',
      )
    }

    const actorId = Number(platformUser?.employeeId) || null
    const actorName = platformUser?.name || 'Administrator'
    const dayKey = new Date().toISOString().slice(0, 10)
    let sent = 0
    for (const person of recipients) {
      const deadline = datePart(
        resolveEffectiveGoalDeadline(person.stages_config, {
          employeeId: person.employee_id,
          departmentId: person.department_id,
          teamId: person.team_id,
        }),
      )
      await emitRuleNotification(client, {
        eventKey: 'goal.reminder.manual',
        recipientEmployeeId: person.employee_id,
        actorEmployeeId: actorId,
        dedupeKey: `goal-manual-reminder:${cycleId}:${person.employee_id}:${dayKey}`,
        destination: goalDestination(cycleId, person.employee_id),
        cycleId,
        personId: person.employee_id,
        dueAt: deadline || null,
        variables: {
          manager: actorName,
          message: String(message ?? '').trim() || 'Please complete your goals.',
          cycle: cycleName,
          deadline: deadline ? formatDate(deadline) : 'the deadline',
        },
      })
      sent += 1
    }

    await client.query('COMMIT')
    return {
      sent,
      skipped: ids.length - sent,
      recipientIds: recipients.map((person) => person.employee_id),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Who still needs to submit — for the blast audience picker. */
export async function listGoalNonSubmitters(cycleId, platformUser) {
  const { listVisibleGoalSubjectIds } = await import('./policy.mjs')
  const visible = await listVisibleGoalSubjectIds(platformUser)
  if (visible.length === 0) return []

  const { rows } = await getPool().query(
    `SELECT
       e.employee_id AS id,
       e.name,
       e.email,
       COALESCE(s.status, 'draft') AS status
     FROM platform.employees e
     LEFT JOIN platform.goal_submissions s
       ON s.cycle_id = $1 AND s.employee_id = e.employee_id
     WHERE e.employee_id = ANY($2::int[])
       AND e.status = 'active'
       AND COALESCE(s.status, 'draft') IN ('draft', 'sent_back', 'incomplete')
     ORDER BY e.name ASC`,
    [cycleId, visible],
  )
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    email: row.email,
    status: row.status,
  }))
}
