/**
 * Authoritative Goals commands with transactional Activity writes.
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'

function isoTimestamp(value) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function actorFromUser(platformUser) {
  return {
    actorEmployeeId: platformUser?.employeeId ?? null,
    actorEmail: platformUser?.email ?? '',
    actorName: platformUser?.name ?? '',
  }
}

function newId(prefix = 'g') {
  return `${prefix}_${crypto.randomUUID()}`
}

function mapMeasurement(row) {
  if (row.kind === 'milestone') {
    return {
      id: row.measurement_id,
      kind: 'milestone',
      title: row.title,
      weight: Number(row.weight),
      complete: Boolean(row.complete),
      proofUrl: row.proof_url ?? undefined,
      comment: row.comment ?? undefined,
    }
  }
  return {
    id: row.measurement_id,
    kind: 'metric',
    title: row.title,
    weight: Number(row.weight),
    unit: row.unit,
    direction: row.direction,
    startValue: row.start_value == null ? undefined : Number(row.start_value),
    targetValue: row.target_value == null ? undefined : Number(row.target_value),
    currentValue:
      row.current_value == null ? undefined : Number(row.current_value),
    rangeMin: row.range_min == null ? undefined : Number(row.range_min),
    rangeMax: row.range_max == null ? undefined : Number(row.range_max),
    proofUrl: row.proof_url ?? undefined,
    comment: row.comment ?? undefined,
  }
}

async function loadGoalsForSubmission(client, cycleId, employeeId) {
  const { rows: goalRows } = await client.query(
    `SELECT * FROM platform.goals
     WHERE cycle_id = $1 AND employee_id = $2
     ORDER BY position, created_at`,
    [cycleId, employeeId],
  )
  const goals = []
  for (const goal of goalRows) {
    const { rows: measurementRows } = await client.query(
      `SELECT * FROM platform.goal_measurements
       WHERE goal_id = $1
       ORDER BY position, created_at`,
      [goal.goal_id],
    )
    const { rows: commentRows } = await client.query(
      `SELECT * FROM platform.goal_comments
       WHERE goal_id = $1
       ORDER BY created_at`,
      [goal.goal_id],
    )
    const measurements = []
    for (const measurement of measurementRows) {
      const mapped = mapMeasurement(measurement)
      const { rows: progressRows } = await client.query(
        `SELECT * FROM platform.goal_progress_entries
         WHERE measurement_id = $1
         ORDER BY recorded_at`,
        [measurement.measurement_id],
      )
      mapped.progressLog = progressRows.map((entry) => ({
        id: entry.entry_id,
        recordedAt: isoTimestamp(entry.recorded_at),
        authorId:
          entry.actor_employee_id == null
            ? undefined
            : String(entry.actor_employee_id),
        authorName: entry.actor_name,
        from: entry.from_value == null ? undefined : Number(entry.from_value),
        to: Number(entry.to_value),
        label: entry.measurement_label ?? undefined,
      }))
      measurements.push(mapped)
    }
    goals.push({
      id: goal.goal_id,
      description: goal.description,
      details: goal.details ?? undefined,
      weight: Number(goal.weight),
      goalType: goal.goal_type,
      processType: goal.process_type,
      priority: goal.priority,
      ownerId:
        goal.owner_employee_id == null
          ? undefined
          : String(goal.owner_employee_id),
      cascadedFromGoalId: goal.cascaded_from_goal_id ?? undefined,
      linkedGoalLabel: goal.linked_goal_label ?? undefined,
      progressStatus: goal.progress_status ?? undefined,
      measurements,
      comments: commentRows.map((comment) => ({
        id: comment.comment_id,
        authorId:
          comment.author_employee_id == null
            ? undefined
            : String(comment.author_employee_id),
        authorName: comment.author_name,
        text: comment.body,
        createdAt: isoTimestamp(comment.created_at),
      })),
      updatedAt: isoTimestamp(goal.updated_at),
    })
  }
  return goals
}

async function ensureSubmission(client, cycleId, employeeId) {
  const { rows } = await client.query(
    `INSERT INTO platform.goal_submissions (cycle_id, employee_id, status)
     VALUES ($1, $2, 'draft')
     ON CONFLICT (cycle_id, employee_id) DO UPDATE
       SET updated_at = platform.goal_submissions.updated_at
     RETURNING *`,
    [cycleId, employeeId],
  )
  return rows[0]
}

async function replaceGoals(client, cycleId, employeeId, goals) {
  await client.query(
    `DELETE FROM platform.goals WHERE cycle_id = $1 AND employee_id = $2`,
    [cycleId, employeeId],
  )
  let position = 0
  for (const goal of goals) {
    const goalId = goal.id || newId('goal')
    await client.query(
      `INSERT INTO platform.goals (
         goal_id, cycle_id, employee_id, owner_employee_id, description, details,
         goal_type, process_type, priority, weight, position, progress_status,
         cascaded_from_goal_id, linked_goal_label
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
       )`,
      [
        goalId,
        cycleId,
        employeeId,
        goal.ownerId ? Number(goal.ownerId) : employeeId,
        goal.description ?? '',
        goal.details ?? null,
        goal.goalType ?? 'outcome',
        goal.processType ?? 'bau',
        goal.priority ?? 'medium',
        goal.weight ?? 0,
        position++,
        goal.progressStatus ?? null,
        goal.cascadedFromGoalId ?? null,
        goal.linkedGoalLabel ?? null,
      ],
    )
    let measurementPosition = 0
    for (const measurement of goal.measurements ?? []) {
      const measurementId = measurement.id || newId('m')
      await client.query(
        `INSERT INTO platform.goal_measurements (
           measurement_id, goal_id, kind, title, weight, position, unit, direction,
           start_value, target_value, current_value, range_min, range_max, complete,
           proof_url, comment
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
         )`,
        [
          measurementId,
          goalId,
          measurement.kind,
          measurement.title ?? '',
          measurement.weight ?? 0,
          measurementPosition++,
          measurement.unit ?? null,
          measurement.direction ?? null,
          measurement.startValue ?? null,
          measurement.targetValue ?? null,
          measurement.currentValue ?? null,
          measurement.rangeMin ?? null,
          measurement.rangeMax ?? null,
          measurement.kind === 'milestone' ? Boolean(measurement.complete) : null,
          measurement.proofUrl ?? null,
          measurement.comment ?? null,
        ],
      )
    }
    for (const comment of goal.comments ?? []) {
      await client.query(
        `INSERT INTO platform.goal_comments (
           comment_id, goal_id, author_employee_id, author_name, body, created_at
         ) VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz, now()))`,
        [
          comment.id || newId('c'),
          goalId,
          comment.authorId ? Number(comment.authorId) : null,
          comment.authorName ?? '',
          comment.text ?? '',
          comment.createdAt ?? null,
        ],
      )
    }
  }
}

function mapSubmission(row, goals, rating) {
  return {
    personId: String(row.employee_id),
    status: row.status,
    postWindowApprovalStage: row.post_window_approval_stage ?? undefined,
    sendBackReason: row.send_back_reason ?? undefined,
    sendBackBy: row.send_back_by_employee_id
      ? {
          id: String(row.send_back_by_employee_id),
          name: row.send_back_by_name ?? '',
        }
      : undefined,
    managerNote: row.manager_note ?? undefined,
    goals,
    rating: rating
      ? {
          tier: Number(rating.tier),
          comment: rating.comment,
          submittedAt: isoTimestamp(rating.submitted_at),
        }
      : undefined,
    version: Number(row.version),
  }
}

export async function getPersonGoals(cycleId, employeeId) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      `SELECT * FROM platform.goal_submissions
       WHERE cycle_id = $1 AND employee_id = $2`,
      [cycleId, employeeId],
    )
    if (!rows[0]) {
      return {
        personId: String(employeeId),
        status: 'draft',
        goals: [],
        version: 0,
      }
    }
    const goals = await loadGoalsForSubmission(client, cycleId, employeeId)
    const { rows: ratingRows } = await client.query(
      `SELECT * FROM platform.goal_ratings
       WHERE cycle_id = $1 AND employee_id = $2`,
      [cycleId, employeeId],
    )
    return mapSubmission(rows[0], goals, ratingRows[0])
  } finally {
    client.release()
  }
}

/** All submissions for a cycle — used to hydrate the Goals SPA from RDS. */
export async function listCycleGoalSubmissions(cycleId) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      `SELECT *
       FROM platform.goal_submissions
       WHERE cycle_id = $1
       ORDER BY employee_id`,
      [cycleId],
    )
    const submissions = []
    for (const row of rows) {
      const goals = await loadGoalsForSubmission(
        client,
        cycleId,
        row.employee_id,
      )
      const { rows: ratingRows } = await client.query(
        `SELECT * FROM platform.goal_ratings
         WHERE cycle_id = $1 AND employee_id = $2`,
        [cycleId, row.employee_id],
      )
      submissions.push(mapSubmission(row, goals, ratingRows[0]))
    }
    return submissions
  } finally {
    client.release()
  }
}

export async function savePersonGoalsDraft(
  cycleId,
  employeeId,
  goals,
  platformUser,
  expectedVersion,
) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    let row = await ensureSubmission(client, cycleId, employeeId)
    row = (
      await client.query(
        `SELECT * FROM platform.goal_submissions
         WHERE cycle_id = $1 AND employee_id = $2
         FOR UPDATE`,
        [cycleId, employeeId],
      )
    ).rows[0]
    if (
      expectedVersion != null &&
      Number(row.version) !== Number(expectedVersion) &&
      Number(expectedVersion) !== 0
    ) {
      throw new HttpError(409, 'Goals were updated elsewhere. Reload and try again.')
    }

    const previousGoals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await replaceGoals(client, cycleId, employeeId, goals)

    let nextStatus = row.status
    if (
      actor.actorEmployeeId === employeeId &&
      (row.status === 'submitted' || row.status === 'approved')
    ) {
      nextStatus = 'draft'
    }

    const { rows } = await client.query(
      `UPDATE platform.goal_submissions
       SET status = $3,
           post_window_approval_stage = CASE
             WHEN $3 = 'draft' THEN NULL
             ELSE post_window_approval_stage
           END,
           version = version + 1,
           updated_at = now()
       WHERE cycle_id = $1 AND employee_id = $2
       RETURNING *`,
      [cycleId, employeeId, nextStatus],
    )

    const correlationId = crypto.randomUUID()
    const previousIds = new Set(previousGoals.map((goal) => goal.id))
    const nextIds = new Set(goals.map((goal) => goal.id))
    for (const goal of goals) {
      if (!previousIds.has(goal.id)) {
        await appendActivityEvent(client, {
          eventKey: 'goal.created',
          entityType: 'goal',
          entityId: goal.id,
          ...actor,
          subjectEmployeeId: employeeId,
          cycleId,
          goalId: goal.id,
          correlationId,
          summary: `Created goal “${goal.description || 'Untitled goal'}”`,
          source: 'api',
        })
      } else {
        await appendActivityEvent(client, {
          eventKey: 'goal.updated',
          entityType: 'goal',
          entityId: goal.id,
          ...actor,
          subjectEmployeeId: employeeId,
          cycleId,
          goalId: goal.id,
          correlationId,
          summary: `Updated goal “${goal.description || 'Untitled goal'}”`,
          source: 'api',
        })
      }
    }
    for (const previous of previousGoals) {
      if (!nextIds.has(previous.id)) {
        await appendActivityEvent(client, {
          eventKey: 'goal.deleted',
          entityType: 'goal',
          entityId: previous.id,
          ...actor,
          subjectEmployeeId: employeeId,
          cycleId,
          goalId: previous.id,
          correlationId,
          summary: `Deleted goal “${previous.description || 'Untitled goal'}”`,
          metadata: { snapshot: previous },
          source: 'api',
        })
      }
    }
    if (nextStatus === 'draft' && row.status !== 'draft') {
      await appendActivityEvent(client, {
        eventKey: 'goal.approval_withdrawn_for_revision',
        entityType: 'goal_submission',
        entityId: `${cycleId}:${employeeId}`,
        ...actor,
        subjectEmployeeId: employeeId,
        cycleId,
        correlationId,
        summary: 'Withdrew submitted goals for revision',
        changes: [{ field: 'status', from: row.status, to: 'draft' }],
        source: 'api',
      })
    } else if (
      actor.actorEmployeeId !== employeeId &&
      (row.status === 'submitted' || row.status === 'approved')
    ) {
      await appendActivityEvent(client, {
        eventKey: 'goal.manager_modified',
        entityType: 'goal_submission',
        entityId: `${cycleId}:${employeeId}`,
        ...actor,
        subjectEmployeeId: employeeId,
        cycleId,
        correlationId,
        summary: 'Manager edited goals',
        source: 'api',
      })
    }

    const nextGoals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await client.query('COMMIT')
    return mapSubmission(rows[0], nextGoals, null)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function submitPersonGoals(
  cycleId,
  employeeId,
  platformUser,
  { late = false, expectedVersion } = {},
) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const { rows: locked } = await client.query(
      `SELECT * FROM platform.goal_submissions
       WHERE cycle_id = $1 AND employee_id = $2
       FOR UPDATE`,
      [cycleId, employeeId],
    )
    if (!locked[0]) throw new HttpError(404, 'Goal submission not found')
    if (
      expectedVersion != null &&
      Number(locked[0].version) !== Number(expectedVersion)
    ) {
      throw new HttpError(409, 'Goals were updated elsewhere. Reload and try again.')
    }
    const previousStatus = locked[0].status
    const { rows } = await client.query(
      `UPDATE platform.goal_submissions
       SET status = 'submitted',
           post_window_approval_stage = $3,
           send_back_reason = NULL,
           send_back_by_employee_id = NULL,
           send_back_by_name = NULL,
           submitted_at = now(),
           version = version + 1,
           updated_at = now()
       WHERE cycle_id = $1 AND employee_id = $2
       RETURNING *`,
      [cycleId, employeeId, late ? 'manager' : null],
    )
    await appendActivityEvent(client, {
      eventKey:
        previousStatus === 'sent_back'
          ? 'goal_submission.resubmitted'
          : 'goal_submission.submitted',
      entityType: 'goal_submission',
      entityId: `${cycleId}:${employeeId}`,
      ...actor,
      subjectEmployeeId: employeeId,
      cycleId,
      summary:
        previousStatus === 'sent_back'
          ? 'Resubmitted goals for approval'
          : 'Submitted goals for approval',
      metadata: { late },
      source: 'api',
    })
    const goals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await client.query('COMMIT')
    return mapSubmission(rows[0], goals, null)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function approvePersonGoals(
  cycleId,
  employeeId,
  platformUser,
  expectedVersion,
) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const { rows: locked } = await client.query(
      `SELECT * FROM platform.goal_submissions
       WHERE cycle_id = $1 AND employee_id = $2
       FOR UPDATE`,
      [cycleId, employeeId],
    )
    if (!locked[0]) throw new HttpError(404, 'Goal submission not found')
    if (
      expectedVersion != null &&
      Number(locked[0].version) !== Number(expectedVersion)
    ) {
      throw new HttpError(409, 'Goals were updated elsewhere. Reload and try again.')
    }

    const stage = locked[0].post_window_approval_stage
    let nextStatus = 'approved'
    let nextStage = null
    let eventKey = 'goal_submission.approved'
    let summary = 'Approved goals'
    if (stage === 'manager') {
      nextStatus = 'submitted'
      nextStage = 'manager_manager'
      eventKey = 'goal_submission.manager_approved'
      summary = 'Approved goals (pending final approval)'
    } else if (stage === 'manager_manager') {
      eventKey = 'goal_submission.final_approved'
      summary = 'Gave final approval on goals'
    }

    const { rows } = await client.query(
      `UPDATE platform.goal_submissions
       SET status = $3,
           post_window_approval_stage = $4,
           approved_at = CASE WHEN $3 = 'approved' THEN now() ELSE approved_at END,
           version = version + 1,
           updated_at = now()
       WHERE cycle_id = $1 AND employee_id = $2
       RETURNING *`,
      [cycleId, employeeId, nextStatus, nextStage],
    )
    await appendActivityEvent(client, {
      eventKey,
      entityType: 'goal_submission',
      entityId: `${cycleId}:${employeeId}`,
      ...actor,
      subjectEmployeeId: employeeId,
      cycleId,
      summary,
      changes: [
        { field: 'status', from: locked[0].status, to: nextStatus },
        {
          field: 'postWindowApprovalStage',
          from: stage,
          to: nextStage,
        },
      ],
      source: 'api',
    })
    const goals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await client.query('COMMIT')
    return mapSubmission(rows[0], goals, null)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function sendBackPersonGoals(
  cycleId,
  employeeId,
  reason,
  platformUser,
  expectedVersion,
) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const { rows: locked } = await client.query(
      `SELECT * FROM platform.goal_submissions
       WHERE cycle_id = $1 AND employee_id = $2
       FOR UPDATE`,
      [cycleId, employeeId],
    )
    if (!locked[0]) throw new HttpError(404, 'Goal submission not found')
    if (
      expectedVersion != null &&
      Number(locked[0].version) !== Number(expectedVersion)
    ) {
      throw new HttpError(409, 'Goals were updated elsewhere. Reload and try again.')
    }
    const { rows } = await client.query(
      `UPDATE platform.goal_submissions
       SET status = 'sent_back',
           post_window_approval_stage = NULL,
           send_back_reason = $3,
           send_back_by_employee_id = $4,
           send_back_by_name = $5,
           version = version + 1,
           updated_at = now()
       WHERE cycle_id = $1 AND employee_id = $2
       RETURNING *`,
      [
        cycleId,
        employeeId,
        reason,
        actor.actorEmployeeId,
        actor.actorName,
      ],
    )
    await appendActivityEvent(client, {
      eventKey: 'goal_submission.sent_back',
      entityType: 'goal_submission',
      entityId: `${cycleId}:${employeeId}`,
      ...actor,
      subjectEmployeeId: employeeId,
      cycleId,
      summary: 'Sent goals back for revision',
      metadata: { hasReason: Boolean(reason?.trim()) },
      source: 'api',
    })
    const goals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await client.query('COMMIT')
    return mapSubmission(rows[0], goals, null)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function importGoalsBundle(bundle, platformUser, fingerprint) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  const imported = []
  try {
    await client.query('BEGIN')
    for (const entry of bundle) {
      const cycleId = entry.cycleId
      const employeeId = Number(entry.employeeId)
      if (!cycleId || !Number.isInteger(employeeId)) continue
      await ensureSubmission(client, cycleId, employeeId)
      await replaceGoals(client, cycleId, employeeId, entry.goals ?? [])
      await client.query(
        `UPDATE platform.goal_submissions
         SET status = $3,
             version = version + 1,
             updated_at = now()
         WHERE cycle_id = $1 AND employee_id = $2`,
        [cycleId, employeeId, entry.status ?? 'draft'],
      )
      await appendActivityEvent(client, {
        eventKey: 'goals.imported',
        entityType: 'goal_submission',
        entityId: `${cycleId}:${employeeId}`,
        ...actor,
        actorType: 'import',
        subjectEmployeeId: employeeId,
        cycleId,
        summary: `Imported goals for employee ${employeeId}`,
        metadata: { fingerprint, goalCount: entry.goals?.length ?? 0 },
        source: 'import',
      })
      imported.push({ cycleId, employeeId })
    }
    await client.query('COMMIT')
    return imported
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
