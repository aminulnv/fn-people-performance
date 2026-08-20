/**
 * Authoritative Goals commands with transactional Activity writes.
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'
import {
  resolveEffectiveGoalDeadline,
  stagesConfigForGoalPolicy,
} from './deadline.mjs'
import { assertGoalSubmission } from './submissionValidation.mjs'
import { normalizeMilestoneWeightsInGoal } from './measurementWeights.mjs'

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

function copyGoalForNewCycle(goal, ownerEmployeeId) {
  return {
    ...goal,
    id: newId('goal'),
    ownerId: String(ownerEmployeeId),
    cascadedFromGoalId: undefined,
    linkedGoalLabel: undefined,
    comments: [],
    measurements: (goal.measurements ?? []).map((measurement) => ({
      ...measurement,
      id: newId('measurement'),
      currentValue:
        measurement.kind === 'metric' ? measurement.startValue : undefined,
      complete: measurement.kind === 'milestone' ? false : undefined,
      proofUrl: undefined,
      comment: undefined,
      progressLog: [],
    })),
  }
}

function requireExpectedVersion(expectedVersion) {
  if (
    expectedVersion == null ||
    !Number.isInteger(Number(expectedVersion)) ||
    Number(expectedVersion) < 0
  ) {
    throw new HttpError(
      428,
      'The current goals version is required. Reload and try again.',
    )
  }
  return Number(expectedVersion)
}

function assertVersion(row, expectedVersion) {
  const requiredVersion = requireExpectedVersion(expectedVersion)
  if (Number(row.version) !== requiredVersion) {
    throw new HttpError(
      409,
      'Goals were updated elsewhere. Reload and try again.',
    )
  }
}

async function postWindowApprovalStage(client, cycleId, employeeId) {
  const { rows } = await client.query(
    `SELECT
       COALESCE(grp.stages_config, cycle.stages_config) AS stages_config,
       COALESCE(grp.goal_count_policy, cycle.goal_count_policy) AS goal_count_policy,
       COALESCE(grp.post_window_goal_policy, cycle.post_window_goal_policy)
         AS post_window_goal_policy,
       grp.id AS group_id,
       employee.employee_id,
       employee.department_id,
       employee.team_id
     FROM platform.review_cycles cycle
     JOIN platform.employees employee ON employee.employee_id = $2
     LEFT JOIN platform.review_cycle_group_members membership
       ON membership.cycle_id = cycle.id
      AND membership.employee_id = employee.employee_id
     LEFT JOIN platform.review_cycle_groups grp
       ON grp.id = membership.group_id
      AND grp.cycle_id = cycle.id
      AND grp.deleted_at IS NULL
     WHERE cycle.id = $1
       AND cycle.deleted_at IS NULL`,
    [cycleId, employeeId],
  )
  const cycle = rows[0]
  if (!cycle) throw new HttpError(404, 'Performance cycle not found')
  const goalWindowEnd = resolveEffectiveGoalDeadline(
    stagesConfigForGoalPolicy(cycle),
    {
      employeeId: cycle.employee_id,
      departmentId: cycle.department_id,
      teamId: cycle.team_id,
    },
  )
  const today = new Date().toISOString().slice(0, 10)
  const isLate = Boolean(goalWindowEnd && today > goalWindowEnd)
  return {
    cycle,
    isLate,
    approvalStage:
      isLate && cycle.post_window_goal_policy === 'two_tier_approval'
        ? 'manager'
        : null,
  }
}

function resolveMeasureGroupId(measurement, goalMeasurements) {
  if (measurement.kind !== 'milestone') return null
  if (measurement.measureGroupId) return measurement.measureGroupId
  const title = measurement.measureTitle?.trim()
  if (title) {
    for (const other of goalMeasurements) {
      if (other.kind !== 'milestone') continue
      if (other.measureTitle?.trim() === title && other.measureGroupId) {
        return other.measureGroupId
      }
    }
  }
  return measurement.listId ?? measurement.id
}

function mapMeasurement(row) {
  if (row.kind === 'milestone') {
    return {
      id: row.measurement_id,
      kind: 'milestone',
      measureGroupId: row.measure_group_id ?? undefined,
      measureTitle: row.measure_title ?? undefined,
      listId: row.list_id ?? undefined,
      listTitle: row.list_title ?? undefined,
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
  if (goalRows.length === 0) return []

  const goalIds = goalRows.map((goal) => goal.goal_id)
  const [
    { rows: measurementRows },
    { rows: commentRows },
    { rows: progressRows },
  ] = await Promise.all([
    client.query(
      `SELECT * FROM platform.goal_measurements
       WHERE goal_id = ANY($1::text[])
       ORDER BY goal_id, position, created_at`,
      [goalIds],
    ),
    client.query(
      `SELECT * FROM platform.goal_comments
       WHERE goal_id = ANY($1::text[])
       ORDER BY goal_id, created_at`,
      [goalIds],
    ),
    client.query(
      `SELECT * FROM platform.goal_progress_entries
       WHERE goal_id = ANY($1::text[])
       ORDER BY goal_id, measurement_id, recorded_at`,
      [goalIds],
    ),
  ])

  const progressByMeasurement = new Map()
  for (const entry of progressRows) {
    const entries = progressByMeasurement.get(entry.measurement_id) ?? []
    entries.push({
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
    })
    progressByMeasurement.set(entry.measurement_id, entries)
  }

  const measurementsByGoal = new Map()
  for (const measurement of measurementRows) {
    const mapped = mapMeasurement(measurement)
    mapped.progressLog =
      progressByMeasurement.get(measurement.measurement_id) ?? []
    const measurements = measurementsByGoal.get(measurement.goal_id) ?? []
    measurements.push(mapped)
    measurementsByGoal.set(measurement.goal_id, measurements)
  }

  const commentsByGoal = new Map()
  for (const comment of commentRows) {
    const comments = commentsByGoal.get(comment.goal_id) ?? []
    comments.push({
      id: comment.comment_id,
      authorId:
        comment.author_employee_id == null
          ? undefined
          : String(comment.author_employee_id),
      authorName: comment.author_name,
      text: comment.body,
      createdAt: isoTimestamp(comment.created_at),
    })
    commentsByGoal.set(comment.goal_id, comments)
  }

  for (const [goalId, measurements] of measurementsByGoal) {
    measurementsByGoal.set(goalId, normalizeMilestoneWeightsInGoal(measurements))
  }

  return goalRows.map((goal) => ({
      id: goal.goal_id,
      description: goal.description,
      details: goal.details ?? undefined,
      weight: Number(goal.weight),
      ownerId:
        goal.owner_employee_id == null
          ? undefined
          : String(goal.owner_employee_id),
      cascadedFromGoalId: goal.cascaded_from_goal_id ?? undefined,
      linkedGoalLabel: goal.linked_goal_label ?? undefined,
      measurements: measurementsByGoal.get(goal.goal_id) ?? [],
      comments: commentsByGoal.get(goal.goal_id) ?? [],
      updatedAt: isoTimestamp(goal.updated_at),
  }))
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

async function replaceGoals(client, cycleId, employeeId, goals, actor = {}) {
  const { rows: existingGoalRows } = await client.query(
    `SELECT goal_id
     FROM platform.goals
     WHERE cycle_id = $1 AND employee_id = $2`,
    [cycleId, employeeId],
  )
  const existingGoalIds = new Set(
    existingGoalRows.map((row) => row.goal_id),
  )
  const incomingGoalIds = new Set()

  let position = 0
  for (const goal of goals) {
    const goalId = goal.id || newId('goal')
    if (incomingGoalIds.has(goalId)) {
      throw new HttpError(400, `Duplicate goal id: ${goalId}`)
    }
    incomingGoalIds.add(goalId)

    const { rows: goalIdentityRows } = await client.query(
      `SELECT cycle_id, employee_id
       FROM platform.goals
       WHERE goal_id = $1`,
      [goalId],
    )
    const goalIdentity = goalIdentityRows[0]
    if (
      goalIdentity &&
      (goalIdentity.cycle_id !== cycleId ||
        Number(goalIdentity.employee_id) !== employeeId)
    ) {
      throw new HttpError(409, 'Goal id belongs to another submission')
    }

    const goalValues = [
      goalId,
      cycleId,
      employeeId,
      goal.ownerId ? Number(goal.ownerId) : employeeId,
      goal.description ?? '',
      goal.details ?? null,
      goal.weight ?? 0,
      position++,
      goal.cascadedFromGoalId ?? null,
      goal.linkedGoalLabel ?? null,
    ]
    if (goalIdentity) {
      await client.query(
        `UPDATE platform.goals
         SET owner_employee_id = $4,
             description = $5,
             details = $6,
             weight = $7,
             position = $8,
             cascaded_from_goal_id = $9,
             linked_goal_label = $10,
             updated_at = now()
         WHERE goal_id = $1
           AND cycle_id = $2
           AND employee_id = $3`,
        goalValues,
      )
    } else {
      await client.query(
        `INSERT INTO platform.goals (
           goal_id, cycle_id, employee_id, owner_employee_id, description, details,
           weight, position,
           cascaded_from_goal_id, linked_goal_label
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
         )`,
        goalValues,
      )
    }

    const { rows: existingMeasurementRows } = await client.query(
      `SELECT measurement_id
       FROM platform.goal_measurements
       WHERE goal_id = $1`,
      [goalId],
    )
    const existingMeasurementIds = new Set(
      existingMeasurementRows.map((row) => row.measurement_id),
    )
    const incomingMeasurementIds = new Set()

    const normalizedMeasurements = normalizeMilestoneWeightsInGoal(
      goal.measurements ?? [],
    )

    let measurementPosition = 0
    for (const measurement of normalizedMeasurements) {
      const measurementId = measurement.id || newId('m')
      if (incomingMeasurementIds.has(measurementId)) {
        throw new HttpError(400, `Duplicate measurement id: ${measurementId}`)
      }
      incomingMeasurementIds.add(measurementId)

      const { rows: measurementIdentityRows } = await client.query(
        `SELECT goal_id
         FROM platform.goal_measurements
         WHERE measurement_id = $1`,
        [measurementId],
      )
      const measurementIdentity = measurementIdentityRows[0]
      if (measurementIdentity && measurementIdentity.goal_id !== goalId) {
        throw new HttpError(409, 'Measurement id belongs to another goal')
      }
      const measurementValues = [
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
        measurement.kind === 'milestone' ? measurement.listTitle ?? null : null,
        measurement.kind === 'milestone'
          ? measurement.listId ?? measurement.id
          : null,
        measurement.kind === 'milestone'
          ? resolveMeasureGroupId(measurement, normalizedMeasurements)
          : null,
        measurement.kind === 'milestone' ? measurement.measureTitle ?? null : null,
      ]
      if (measurementIdentity) {
        await client.query(
          `UPDATE platform.goal_measurements
           SET kind = $3,
               title = $4,
               weight = $5,
               position = $6,
               unit = $7,
               direction = $8,
               start_value = $9,
               target_value = $10,
               current_value = $11,
               range_min = $12,
               range_max = $13,
               complete = $14,
               proof_url = $15,
               comment = $16,
               list_title = $17,
               list_id = $18,
               measure_group_id = $19,
               measure_title = $20,
               updated_at = now()
           WHERE measurement_id = $1 AND goal_id = $2`,
          measurementValues,
        )
      } else {
        await client.query(
          `INSERT INTO platform.goal_measurements (
             measurement_id, goal_id, kind, title, weight, position, unit, direction,
             start_value, target_value, current_value, range_min, range_max, complete,
             proof_url, comment, list_title, list_id, measure_group_id, measure_title
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
           )`,
          measurementValues,
        )
      }

      for (const progress of measurement.progressLog ?? []) {
        const entryId = progress.id || newId('progress')
        const { rows: existingProgressRows } = await client.query(
          `SELECT goal_id, measurement_id
           FROM platform.goal_progress_entries
           WHERE entry_id = $1`,
          [entryId],
        )
        const existingProgress = existingProgressRows[0]
        if (
          existingProgress &&
          (existingProgress.goal_id !== goalId ||
            existingProgress.measurement_id !== measurementId)
        ) {
          throw new HttpError(409, 'Progress id belongs to another measurement')
        }
        if (!existingProgress) {
          await client.query(
            `INSERT INTO platform.goal_progress_entries (
               entry_id, goal_id, measurement_id, actor_employee_id, actor_name,
               measurement_label, from_value, to_value, recorded_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())`,
            [
              entryId,
              goalId,
              measurementId,
              actor.actorEmployeeId ?? null,
              actor.actorName ?? '',
              progress.label ?? measurement.title ?? null,
              progress.from ?? null,
              progress.to,
            ],
          )
        }
      }
    }

    const removedMeasurementIds = [...existingMeasurementIds].filter(
      (measurementId) => !incomingMeasurementIds.has(measurementId),
    )
    if (removedMeasurementIds.length > 0) {
      await client.query(
        `DELETE FROM platform.goal_measurements
         WHERE goal_id = $1
           AND measurement_id = ANY($2::text[])`,
        [goalId, removedMeasurementIds],
      )
    }

    for (const comment of goal.comments ?? []) {
      const commentId = comment.id || newId('c')
      const { rows: commentIdentityRows } = await client.query(
        `SELECT goal_id FROM platform.goal_comments WHERE comment_id = $1`,
        [commentId],
      )
      const commentIdentity = commentIdentityRows[0]
      if (commentIdentity && commentIdentity.goal_id !== goalId) {
        throw new HttpError(409, 'Comment id belongs to another goal')
      }
      if (!commentIdentity) {
        await client.query(
          `INSERT INTO platform.goal_comments (
             comment_id, goal_id, author_employee_id, author_name, body, created_at
           ) VALUES ($1,$2,$3,$4,$5,now())`,
          [
            commentId,
            goalId,
            actor.actorEmployeeId ?? null,
            actor.actorName ?? '',
            comment.text ?? '',
          ],
        )
      }
    }
  }

  const removedGoalIds = [...existingGoalIds].filter(
    (goalId) => !incomingGoalIds.has(goalId),
  )
  if (removedGoalIds.length > 0) {
    await client.query(
      `DELETE FROM platform.goals
       WHERE cycle_id = $1
         AND employee_id = $2
         AND goal_id = ANY($3::text[])`,
      [cycleId, employeeId, removedGoalIds],
    )
  }
}

function approvalActorFromRow(prefix, row) {
  const id = row[`${prefix}_employee_id`]
  if (!id) return undefined
  const actor = {
    id: String(id),
    name: row[`${prefix}_name`] ?? '',
  }
  const avatarUrl = String(row[`${prefix}_avatar_url`] ?? '').trim()
  if (avatarUrl) actor.avatarUrl = avatarUrl
  return actor
}

async function enrichSubmissionRow(client, row) {
  if (!row) return row
  const ids = [
    row.approved_by_employee_id,
    row.send_back_by_employee_id,
  ].filter(Boolean)
  if (!ids.length) return row
  const { rows } = await client.query(
    `SELECT employee_id, avatar_url
     FROM platform.employees
     WHERE employee_id = ANY($1::int[])`,
    [ids],
  )
  const avatars = new Map(
    rows.map((entry) => [entry.employee_id, entry.avatar_url ?? '']),
  )
  return {
    ...row,
    approved_by_avatar_url: row.approved_by_employee_id
      ? avatars.get(row.approved_by_employee_id) ?? null
      : null,
    send_back_by_avatar_url: row.send_back_by_employee_id
      ? avatars.get(row.send_back_by_employee_id) ?? null
      : null,
  }
}

async function mapSubmissionRow(client, row, goals, rating) {
  return mapSubmission(await enrichSubmissionRow(client, row), goals, rating)
}

const SUBMISSION_FROM = `
  FROM platform.goal_submissions gs
  LEFT JOIN platform.employees approved_by
    ON approved_by.employee_id = gs.approved_by_employee_id
  LEFT JOIN platform.employees send_back_by
    ON send_back_by.employee_id = gs.send_back_by_employee_id
`

function mapSubmission(row, goals, rating) {
  return {
    personId: String(row.employee_id),
    status: row.status,
    postWindowApprovalStage: row.post_window_approval_stage ?? undefined,
    sendBackReason: row.send_back_reason ?? undefined,
    sendBackBy: approvalActorFromRow('send_back_by', row),
    managerNote: row.manager_note ?? undefined,
    approvedBy: approvalActorFromRow('approved_by', row),
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

function activityGoalShape(goal) {
  return {
    description: goal.description ?? '',
    details: goal.details ?? null,
    weight: Number(goal.weight ?? 0),
    ownerId: goal.ownerId ?? null,
    cascadedFromGoalId: goal.cascadedFromGoalId ?? null,
    measurements: (goal.measurements ?? []).map((measurement) => ({
      id: measurement.id,
      kind: measurement.kind,
      title: measurement.title ?? '',
      weight: Number(measurement.weight ?? 0),
      unit: measurement.unit ?? null,
      direction: measurement.direction ?? null,
      startValue: measurement.startValue ?? null,
      targetValue: measurement.targetValue ?? null,
      currentValue: measurement.currentValue ?? null,
      rangeMin: measurement.rangeMin ?? null,
      rangeMax: measurement.rangeMax ?? null,
      complete:
        measurement.kind === 'milestone'
          ? Boolean(measurement.complete)
          : null,
      proofUrl: measurement.proofUrl ?? null,
    })),
  }
}

async function appendGoalDiffActivity(
  client,
  {
    previousGoals,
    nextGoals,
    actor,
    employeeId,
    cycleId,
    correlationId = crypto.randomUUID(),
  },
) {
  const previousById = new Map(
    previousGoals.map((goal) => [goal.id, goal]),
  )
  const nextById = new Map(nextGoals.map((goal) => [goal.id, goal]))
  for (const goal of nextGoals) {
    const previous = previousById.get(goal.id)
    if (!previous) {
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
      continue
    }
    const from = activityGoalShape(previous)
    const to = activityGoalShape(goal)
    if (JSON.stringify(from) === JSON.stringify(to)) continue
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
      changes: [{ field: 'goal', from, to }],
      source: 'api',
    })
  }
  for (const previous of previousGoals) {
    if (nextById.has(previous.id)) continue
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
      metadata: {
        description: previous.description ?? '',
      },
      source: 'api',
    })
  }
  return correlationId
}

export async function getPersonGoals(cycleId, employeeId) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      `SELECT gs.*,
              approved_by.avatar_url AS approved_by_avatar_url,
              send_back_by.avatar_url AS send_back_by_avatar_url
       ${SUBMISSION_FROM}
       WHERE gs.cycle_id = $1 AND gs.employee_id = $2`,
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
export async function listCycleGoalSubmissions(cycleId, subjectEmployeeIds = null) {
  const client = await getPool().connect()
  try {
    if (Array.isArray(subjectEmployeeIds) && subjectEmployeeIds.length === 0) {
      return []
    }
    const { rows } = await client.query(
      `SELECT gs.*,
              approved_by.avatar_url AS approved_by_avatar_url,
              send_back_by.avatar_url AS send_back_by_avatar_url
       ${SUBMISSION_FROM}
       WHERE gs.cycle_id = $1
         AND ($2::int[] IS NULL OR gs.employee_id = ANY($2::int[]))
       ORDER BY gs.employee_id`,
      [cycleId, subjectEmployeeIds],
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
    const requiredVersion = requireExpectedVersion(expectedVersion)
    let row = (
      await client.query(
        `SELECT * FROM platform.goal_submissions
         WHERE cycle_id = $1 AND employee_id = $2
         FOR UPDATE`,
        [cycleId, employeeId],
      )
    ).rows[0]
    if (!row) {
      if (requiredVersion !== 0) {
        throw new HttpError(
          409,
          'Goals were updated elsewhere. Reload and try again.',
        )
      }
      row = await ensureSubmission(client, cycleId, employeeId)
    } else {
      assertVersion(row, requiredVersion)
    }

    const previousGoals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await replaceGoals(client, cycleId, employeeId, goals, actor)

    let nextStatus = row.status
    let nextApprovalStage = row.post_window_approval_stage
    if (
      actor.actorEmployeeId === employeeId &&
      (row.status === 'submitted' || row.status === 'approved')
    ) {
      nextStatus = 'draft'
      nextApprovalStage = null
    } else if (
      actor.actorEmployeeId !== employeeId &&
      row.status === 'approved'
    ) {
      nextStatus = 'submitted'
      nextApprovalStage = (
        await postWindowApprovalStage(client, cycleId, employeeId)
      ).approvalStage
    }

    const { rows } = await client.query(
      `UPDATE platform.goal_submissions
       SET status = $3,
           post_window_approval_stage = $4,
           approved_at = CASE WHEN $3 = 'approved' THEN approved_at ELSE NULL END,
           approved_by_employee_id = CASE
             WHEN $3 = 'approved' THEN approved_by_employee_id
             ELSE NULL
           END,
           approved_by_name = CASE
             WHEN $3 = 'approved' THEN approved_by_name
             ELSE NULL
           END,
           version = version + 1,
           updated_at = now()
       WHERE cycle_id = $1 AND employee_id = $2
       RETURNING *`,
      [cycleId, employeeId, nextStatus, nextApprovalStage],
    )
    if (nextStatus !== 'approved') {
      await client.query(
        `DELETE FROM platform.goal_ratings
         WHERE cycle_id = $1 AND employee_id = $2`,
        [cycleId, employeeId],
      )
    }

    const correlationId = await appendGoalDiffActivity(client, {
      previousGoals,
      nextGoals: goals,
      actor,
      employeeId,
      cycleId,
    })
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
    return mapSubmissionRow(client, rows[0], nextGoals, null)
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
  { goals, expectedVersion } = {},
) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const requiredVersion = requireExpectedVersion(expectedVersion)
    let submission = (
      await client.query(
      `SELECT * FROM platform.goal_submissions
       WHERE cycle_id = $1 AND employee_id = $2
       FOR UPDATE`,
      [cycleId, employeeId],
      )
    ).rows[0]
    if (!submission) {
      if (!Array.isArray(goals)) {
        throw new HttpError(404, 'Goal submission not found')
      }
      if (requiredVersion !== 0) {
        throw new HttpError(
          409,
          'Goals were updated elsewhere. Reload and try again.',
        )
      }
      submission = await ensureSubmission(client, cycleId, employeeId)
    } else {
      assertVersion(submission, requiredVersion)
    }
    const previousStatus = submission.status
    if (previousStatus !== 'draft' && previousStatus !== 'sent_back') {
      throw new HttpError(
        409,
        `Cannot submit goals while status is ${previousStatus}.`,
      )
    }

    const previousGoals = await loadGoalsForSubmission(
      client,
      cycleId,
      employeeId,
    )
    const submittedGoals = Array.isArray(goals) ? goals : previousGoals
    const { cycle, isLate, approvalStage } =
      await postWindowApprovalStage(client, cycleId, employeeId)
    if (isLate && cycle.post_window_goal_policy === 'hard_stop') {
      throw new HttpError(409, 'The goal submission window is closed.')
    }
    assertGoalSubmission(submittedGoals, cycle.goal_count_policy)

    if (Array.isArray(goals)) {
      await replaceGoals(
        client,
        cycleId,
        employeeId,
        submittedGoals,
        actor,
      )
    }

    const { rows } = await client.query(
      `UPDATE platform.goal_submissions
       SET status = 'submitted',
           post_window_approval_stage = $3,
           send_back_reason = NULL,
           send_back_by_employee_id = NULL,
           send_back_by_name = NULL,
           approved_at = NULL,
           approved_by_employee_id = NULL,
           approved_by_name = NULL,
           submitted_at = now(),
           version = version + 1,
           updated_at = now()
       WHERE cycle_id = $1 AND employee_id = $2
       RETURNING *`,
      [cycleId, employeeId, approvalStage],
    )
    const correlationId = await appendGoalDiffActivity(client, {
      previousGoals,
      nextGoals: submittedGoals,
      actor,
      employeeId,
      cycleId,
    })
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
      correlationId,
      summary:
        previousStatus === 'sent_back'
          ? 'Resubmitted goals for approval'
          : 'Submitted goals for approval',
      metadata: { late: isLate },
      source: 'api',
    })
    const nextGoals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await client.query('COMMIT')
    return mapSubmissionRow(client, rows[0], nextGoals, null)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function copyPreviousCycleGoals(
  cycleId,
  employeeId,
  platformUser,
  expectedVersion,
) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const requiredVersion = requireExpectedVersion(expectedVersion)
    let submission = (
      await client.query(
        `SELECT *
         FROM platform.goal_submissions
         WHERE cycle_id = $1 AND employee_id = $2
         FOR UPDATE`,
        [cycleId, employeeId],
      )
    ).rows[0]
    if (!submission) {
      if (requiredVersion !== 0) {
        throw new HttpError(
          409,
          'Goals were updated elsewhere. Reload and try again.',
        )
      }
      submission = await ensureSubmission(client, cycleId, employeeId)
    } else {
      assertVersion(submission, requiredVersion)
    }
    if (submission.status !== 'draft') {
      throw new HttpError(409, 'Previous goals can only be copied into a draft.')
    }
    const currentGoals = await loadGoalsForSubmission(
      client,
      cycleId,
      employeeId,
    )
    if (currentGoals.length > 0) {
      throw new HttpError(
        409,
        'Previous goals can only be copied into an empty draft.',
      )
    }

    const { rows: previousCycleRows } = await client.query(
      `SELECT previous.id
       FROM platform.review_cycles current
       JOIN LATERAL (
         SELECT id
         FROM platform.review_cycles
         WHERE deleted_at IS NULL
           AND start_date < current.start_date
         ORDER BY start_date DESC
         LIMIT 1
       ) previous ON true
       WHERE current.id = $1
         AND current.deleted_at IS NULL`,
      [cycleId],
    )
    const previousCycleId = previousCycleRows[0]?.id
    if (!previousCycleId) {
      throw new HttpError(409, 'No previous cycle is available.')
    }
    const previousGoals = await loadGoalsForSubmission(
      client,
      previousCycleId,
      employeeId,
    )
    if (previousGoals.length === 0) {
      throw new HttpError(409, 'No goals were found in the previous cycle.')
    }

    const copiedGoals = previousGoals.map((goal) =>
      copyGoalForNewCycle(goal, employeeId),
    )
    await replaceGoals(
      client,
      cycleId,
      employeeId,
      copiedGoals,
      actor,
    )
    const { rows: submissionRows } = await client.query(
      `UPDATE platform.goal_submissions
       SET version = version + 1,
           updated_at = now()
       WHERE cycle_id = $1 AND employee_id = $2
       RETURNING *`,
      [cycleId, employeeId],
    )
    const correlationId = crypto.randomUUID()
    for (const goal of copiedGoals) {
      await appendActivityEvent(client, {
        eventKey: 'goal.copied_from_previous_cycle',
        entityType: 'goal',
        entityId: goal.id,
        ...actor,
        subjectEmployeeId: employeeId,
        cycleId,
        goalId: goal.id,
        correlationId,
        summary: `Copied goal “${goal.description || 'Untitled goal'}” from ${previousCycleId}`,
        metadata: { previousCycleId },
        source: 'api',
      })
    }
    const goals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await client.query('COMMIT')
    return mapSubmissionRow(client, submissionRows[0], goals, null)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function cascadeGoalToEmployees(
  cycleId,
  sourceEmployeeId,
  sourceGoalId,
  recipientEmployeeIds,
  expectedVersions,
  platformUser,
) {
  const recipients = [
    ...new Set((recipientEmployeeIds ?? []).map(Number).filter(Number.isInteger)),
  ]
  if (recipients.length === 0) {
    throw new HttpError(400, 'Select at least one cascade recipient.')
  }

  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const sourceGoals = await loadGoalsForSubmission(
      client,
      cycleId,
      sourceEmployeeId,
    )
    const sourceGoal = sourceGoals.find((goal) => goal.id === sourceGoalId)
    if (!sourceGoal) throw new HttpError(404, 'Source goal not found')

    const results = []
    const childGoalIds = []
    for (const recipientEmployeeId of recipients) {
      const expectedVersion = expectedVersions?.[recipientEmployeeId]
      const requiredVersion = requireExpectedVersion(expectedVersion)
      let submission = (
        await client.query(
          `SELECT *
           FROM platform.goal_submissions
           WHERE cycle_id = $1 AND employee_id = $2
           FOR UPDATE`,
          [cycleId, recipientEmployeeId],
        )
      ).rows[0]
      if (!submission) {
        if (requiredVersion !== 0) {
          throw new HttpError(
            409,
            'Recipient goals were updated elsewhere. Reload and try again.',
          )
        }
        submission = await ensureSubmission(
          client,
          cycleId,
          recipientEmployeeId,
        )
      } else {
        assertVersion(submission, requiredVersion)
      }

      const recipientGoals = await loadGoalsForSubmission(
        client,
        cycleId,
        recipientEmployeeId,
      )
      if (
        recipientGoals.some(
          (goal) => goal.cascadedFromGoalId === sourceGoalId,
        )
      ) {
        throw new HttpError(
          409,
          `Goal is already cascaded to employee ${recipientEmployeeId}.`,
        )
      }
      const childGoal = {
        id: newId('goal'),
        description: `Untitled Cascading Goal from ${actor.actorName || 'manager'}`,
        details: undefined,
        weight: 0,
        ownerId: String(recipientEmployeeId),
        cascadedFromGoalId: sourceGoalId,
        linkedGoalLabel: sourceGoal.description || 'Untitled goal',
        measurements: [],
        comments: [],
      }
      await replaceGoals(
        client,
        cycleId,
        recipientEmployeeId,
        [...recipientGoals, childGoal],
        actor,
      )
      const { rows: submissionRows } = await client.query(
        `UPDATE platform.goal_submissions
         SET version = version + 1,
             updated_at = now()
         WHERE cycle_id = $1 AND employee_id = $2
         RETURNING *`,
        [cycleId, recipientEmployeeId],
      )
      const goals = await loadGoalsForSubmission(
        client,
        cycleId,
        recipientEmployeeId,
      )
      results.push(mapSubmission(submissionRows[0], goals, null))
      childGoalIds.push(childGoal.id)
    }

    const correlationId = crypto.randomUUID()
    await appendActivityEvent(client, {
      eventKey: 'goal.cascaded',
      entityType: 'goal',
      entityId: sourceGoalId,
      ...actor,
      subjectEmployeeId: sourceEmployeeId,
      cycleId,
      goalId: sourceGoalId,
      correlationId,
      summary: `Cascaded goal to ${recipients.length} employee${recipients.length === 1 ? '' : 's'}`,
      metadata: {
        recipientEmployeeIds: recipients,
        childGoalIds,
        recipientCount: recipients.length,
      },
      source: 'api',
    })
    for (let index = 0; index < recipients.length; index += 1) {
      await appendActivityEvent(client, {
        eventKey: 'goal.created',
        entityType: 'goal',
        entityId: childGoalIds[index],
        ...actor,
        subjectEmployeeId: recipients[index],
        cycleId,
        goalId: childGoalIds[index],
        correlationId,
        summary: 'Created a cascaded goal',
        metadata: { cascadedFromGoalId: sourceGoalId },
        source: 'api',
      })
    }
    await client.query('COMMIT')
    return results
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
  { goals: editedGoals, expectedVersion } = {},
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
    assertVersion(locked[0], expectedVersion)
    if (locked[0].status !== 'submitted') {
      throw new HttpError(
        409,
        `Cannot approve goals while status is ${locked[0].status}.`,
      )
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

    let correlationId = crypto.randomUUID()
    if (Array.isArray(editedGoals)) {
      const previousGoals = await loadGoalsForSubmission(
        client,
        cycleId,
        employeeId,
      )
      await replaceGoals(
        client,
        cycleId,
        employeeId,
        editedGoals,
        actor,
      )
      correlationId = await appendGoalDiffActivity(client, {
        previousGoals,
        nextGoals: editedGoals,
        actor,
        employeeId,
        cycleId,
        correlationId,
      })
    }

    const { rows } = await client.query(
      `UPDATE platform.goal_submissions
       SET status = $3,
           post_window_approval_stage = $4,
           approved_at = CASE WHEN $3 = 'approved' THEN now() ELSE approved_at END,
           approved_by_employee_id = CASE
             WHEN $3 = 'approved' THEN $5::integer
             ELSE NULL
           END,
           approved_by_name = CASE
             WHEN $3 = 'approved' THEN $6::text
             ELSE NULL
           END,
           version = version + 1,
           updated_at = now()
       WHERE cycle_id = $1 AND employee_id = $2
       RETURNING *`,
      [
        cycleId,
        employeeId,
        nextStatus,
        nextStage,
        actor.actorEmployeeId == null ? null : Number(actor.actorEmployeeId),
        actor.actorName ?? '',
      ],
    )
    if (Array.isArray(editedGoals)) {
      await appendActivityEvent(client, {
        eventKey: 'goal.manager_modified',
        entityType: 'goal_submission',
        entityId: `${cycleId}:${employeeId}`,
        ...actor,
        subjectEmployeeId: employeeId,
        cycleId,
        correlationId,
        summary: 'Manager edited goals during approval',
        source: 'api',
      })
    }
    await appendActivityEvent(client, {
      eventKey,
      entityType: 'goal_submission',
      entityId: `${cycleId}:${employeeId}`,
      ...actor,
      subjectEmployeeId: employeeId,
      cycleId,
      correlationId,
      summary,
      metadata: {
        fromStatus: locked[0].status,
        toStatus: nextStatus,
        fromStage: stage ?? null,
        toStage: nextStage,
      },
      source: 'api',
    })
    const loadedGoals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await client.query('COMMIT')
    return mapSubmissionRow(client, rows[0], loadedGoals, null)
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
    assertVersion(locked[0], expectedVersion)
    if (
      locked[0].status !== 'submitted' &&
      locked[0].status !== 'approved'
    ) {
      throw new HttpError(
        409,
        `Cannot send back goals while status is ${locked[0].status}.`,
      )
    }
    const { rows } = await client.query(
      `UPDATE platform.goal_submissions
       SET status = 'sent_back',
           post_window_approval_stage = NULL,
           send_back_reason = $3,
           send_back_by_employee_id = $4,
           send_back_by_name = $5,
           approved_at = NULL,
           approved_by_employee_id = NULL,
           approved_by_name = NULL,
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
    return mapSubmissionRow(client, rows[0], goals, null)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function submitPersonGoalRating(
  cycleId,
  employeeId,
  rating,
  platformUser,
  expectedVersion,
) {
  const tier = Number(rating?.tier)
  if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
    throw new HttpError(400, 'Rating tier must be between 1 and 5.')
  }

  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const { rows: locked } = await client.query(
      `SELECT submission.*, cycle.stages_config
       FROM platform.goal_submissions submission
       JOIN platform.review_cycles cycle ON cycle.id = submission.cycle_id
       WHERE submission.cycle_id = $1
         AND submission.employee_id = $2
       FOR UPDATE OF submission`,
      [cycleId, employeeId],
    )
    const submission = locked[0]
    if (!submission) throw new HttpError(404, 'Goal submission not found')
    assertVersion(submission, expectedVersion)
    if (submission.status !== 'approved') {
      throw new HttpError(409, 'Only approved goals can be rated.')
    }

    const checkInStart = submission.stages_config?.performance?.employeeStart?.date
    const checkInEnd = submission.stages_config?.performance?.managerEnd?.date
    const today = new Date().toISOString().slice(0, 10)
    if (!checkInStart || !checkInEnd || today < checkInStart || today > checkInEnd) {
      throw new HttpError(409, 'Ratings are only available during performance review.')
    }

    const { rows: existingRatings } = await client.query(
      `SELECT 1
       FROM platform.goal_ratings
       WHERE cycle_id = $1 AND employee_id = $2`,
      [cycleId, employeeId],
    )
    if (existingRatings[0]) {
      throw new HttpError(409, 'A rating has already been submitted.')
    }

    const { rows: ratingRows } = await client.query(
      `INSERT INTO platform.goal_ratings (
         cycle_id, employee_id, tier, comment, submitted_by_employee_id
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        cycleId,
        employeeId,
        tier,
        String(rating?.comment ?? '').trim(),
        actor.actorEmployeeId,
      ],
    )
    const { rows: submissionRows } = await client.query(
      `UPDATE platform.goal_submissions
       SET version = version + 1, updated_at = now()
       WHERE cycle_id = $1 AND employee_id = $2
       RETURNING *`,
      [cycleId, employeeId],
    )
    await appendActivityEvent(client, {
      eventKey: 'goal.check_in_rating_submitted',
      entityType: 'goal_submission',
      entityId: `${cycleId}:${employeeId}`,
      ...actor,
      subjectEmployeeId: employeeId,
      cycleId,
      summary: 'Submitted a performance review rating',
      metadata: { tier },
      source: 'api',
    })
    const goals = await loadGoalsForSubmission(client, cycleId, employeeId)
    await client.query('COMMIT')
    return mapSubmissionRow(client, submissionRows[0], goals, ratingRows[0])
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
      await replaceGoals(
        client,
        cycleId,
        employeeId,
        entry.goals ?? [],
        actor,
      )
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
