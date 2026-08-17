/**
 * Authoritative Performance Cycle persistence with transactional Activity writes.
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'
import {
  validateCalibration,
  validateCycleStagesConfig,
  validateGoalCountPolicy,
} from './validation.mjs'

function isoTimestamp(value) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function isoDate(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function actorFromUser(platformUser) {
  return {
    actorEmployeeId: platformUser?.employeeId ?? null,
    actorEmail: platformUser?.email ?? '',
    actorName: platformUser?.name ?? '',
  }
}

function mapCycle(row, excludedEmployeeIds = []) {
  return {
    id: row.id,
    name: row.name,
    type: row.cycle_type,
    startDate: isoDate(row.start_date),
    endDate: isoDate(row.end_date),
    periodKey: row.period_key ?? undefined,
    stagesConfig: row.stages_config,
    settings: {
      reviewTypes: row.review_types,
      goalCountPolicy: row.goal_count_policy,
      postWindowGoalPolicy: row.post_window_goal_policy,
      excludedEmployeeIds,
      autoScorecardGeneration: row.auto_scorecard_generation,
    },
    calibration: row.calibration_config,
    isTest: row.is_test || undefined,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    version: Number(row.version),
  }
}

async function loadExclusions(client, cycleId) {
  const { rows } = await client.query(
    `SELECT employee_id
     FROM platform.review_cycle_grade_exclusions
     WHERE cycle_id = $1
     ORDER BY employee_id`,
    [cycleId],
  )
  return rows.map((row) => Number(row.employee_id))
}

async function replaceExclusions(client, cycleId, employeeIds) {
  await client.query(
    `DELETE FROM platform.review_cycle_grade_exclusions WHERE cycle_id = $1`,
    [cycleId],
  )
  const unique = [...new Set((employeeIds ?? []).map(Number).filter(Number.isInteger))]
  for (const employeeId of unique) {
    await client.query(
      `INSERT INTO platform.review_cycle_grade_exclusions (cycle_id, employee_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [cycleId, employeeId],
    )
  }
  return unique
}

async function getCycleRow(client, cycleId, { forUpdate = false, includeDeleted = false } = {}) {
  const { rows } = await client.query(
    `SELECT *
     FROM platform.review_cycles
     WHERE id = $1
       ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [cycleId],
  )
  return rows[0] ?? null
}

async function mapCycleWithExclusions(client, row) {
  if (!row) return null
  const exclusions = await loadExclusions(client, row.id)
  return mapCycle(row, exclusions)
}

function assertExpectedVersion(row, expectedVersion) {
  if (expectedVersion == null) return
  if (Number(row.version) !== Number(expectedVersion)) {
    throw new HttpError(409, 'Cycle was updated by someone else. Reload and try again.')
  }
}

function fieldChanges(before, after, fields) {
  const changes = []
  for (const field of fields) {
    const from = before[field]
    const to = after[field]
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field, from, to })
    }
  }
  return changes
}

export async function listReviewCycles() {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      `SELECT *
       FROM platform.review_cycles
       WHERE deleted_at IS NULL
       ORDER BY start_date DESC, created_at DESC`,
    )
    const cycles = []
    for (const row of rows) {
      cycles.push(await mapCycleWithExclusions(client, row))
    }
    return cycles
  } finally {
    client.release()
  }
}

export async function getReviewCycle(cycleId) {
  const client = await getPool().connect()
  try {
    const row = await getCycleRow(client, cycleId)
    return mapCycleWithExclusions(client, row)
  } finally {
    client.release()
  }
}

export async function createReviewCycle(input, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    validateGoalCountPolicy(input.settings.goalCountPolicy)
    validateCycleStagesConfig(input.stagesConfig)
    validateCalibration(input.calibration)

    const id = input.id || `adhoc-${crypto.randomUUID()}`
    const { rows } = await client.query(
      `INSERT INTO platform.review_cycles (
         id, name, cycle_type, period_key, start_date, end_date, is_test,
         source_cycle_id, stages_config, review_types, goal_count_policy,
         post_window_goal_policy, auto_scorecard_generation, calibration_config,
         created_by_employee_id, updated_by_employee_id
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14::jsonb,$15,$15
       )
       RETURNING *`,
      [
        id,
        input.name,
        input.type,
        input.periodKey ?? null,
        input.startDate,
        input.endDate,
        Boolean(input.isTest),
        input.sourceCycleId ?? null,
        JSON.stringify(input.stagesConfig),
        JSON.stringify(input.settings.reviewTypes),
        JSON.stringify(input.settings.goalCountPolicy),
        input.settings.postWindowGoalPolicy,
        Boolean(input.settings.autoScorecardGeneration),
        JSON.stringify(input.calibration),
        actor.actorEmployeeId,
      ],
    )
    const exclusions = await replaceExclusions(
      client,
      id,
      input.settings.excludedEmployeeIds,
    )
    const cycle = mapCycle(rows[0], exclusions)
    await appendActivityEvent(client, {
      eventKey: input.isTest ? 'review_cycle.test_created' : 'review_cycle.created',
      entityType: 'review_cycle',
      entityId: cycle.id,
      ...actor,
      summary: input.isTest
        ? `Created test cycle ${cycle.name}`
        : `Created performance cycle ${cycle.name}`,
      metadata: {
        type: cycle.type,
        periodKey: cycle.periodKey,
        sourceCycleId: input.sourceCycleId,
      },
      source: 'api',
    })
    await client.query('COMMIT')
    return cycle
  } catch (error) {
    await client.query('ROLLBACK')
    if (error?.code === '23505') {
      throw new HttpError(409, 'A cycle for this period already exists.')
    }
    throw error
  } finally {
    client.release()
  }
}

export async function updateReviewCycleSettings(cycleId, patch, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const row = await getCycleRow(client, cycleId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Cycle not found.')
    assertExpectedVersion(row, patch.expectedVersion)

    const before = await mapCycleWithExclusions(client, row)
    const nextSettings = {
      ...before.settings,
      ...patch,
      reviewTypes: patch.reviewTypes
        ? { ...patch.reviewTypes, line_manager: true }
        : before.settings.reviewTypes,
      goalCountPolicy: {
        ...before.settings.goalCountPolicy,
        ...patch.goalCountPolicy,
      },
      excludedEmployeeIds:
        patch.excludedEmployeeIds ?? before.settings.excludedEmployeeIds,
    }
    validateGoalCountPolicy(nextSettings.goalCountPolicy)

    const { rows } = await client.query(
      `UPDATE platform.review_cycles
       SET name = $2,
           start_date = $3,
           end_date = $4,
           review_types = $5::jsonb,
           goal_count_policy = $6::jsonb,
           post_window_goal_policy = $7,
           auto_scorecard_generation = $8,
           version = version + 1,
           updated_by_employee_id = $9,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        cycleId,
        patch.name?.trim() || before.name,
        patch.startDate ?? before.startDate,
        patch.endDate ?? before.endDate,
        JSON.stringify(nextSettings.reviewTypes),
        JSON.stringify(nextSettings.goalCountPolicy),
        nextSettings.postWindowGoalPolicy,
        Boolean(nextSettings.autoScorecardGeneration),
        actor.actorEmployeeId,
      ],
    )
    const exclusions = await replaceExclusions(
      client,
      cycleId,
      nextSettings.excludedEmployeeIds,
    )
    const cycle = mapCycle(rows[0], exclusions)
    const changes = fieldChanges(before, cycle, [
      'name',
      'startDate',
      'endDate',
    ]).concat(
      fieldChanges(before.settings, cycle.settings, [
        'reviewTypes',
        'goalCountPolicy',
        'postWindowGoalPolicy',
        'excludedEmployeeIds',
        'autoScorecardGeneration',
      ]),
    )
    if (changes.length > 0) {
      await appendActivityEvent(client, {
        eventKey: 'review_cycle.settings_updated',
        entityType: 'review_cycle',
        entityId: cycle.id,
        ...actor,
        summary: `Updated settings for ${cycle.name}`,
        changes,
        metadata: { version: cycle.version },
        source: 'api',
      })
    }
    await client.query('COMMIT')
    return cycle
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateReviewCycleStages(cycleId, input, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const row = await getCycleRow(client, cycleId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Cycle not found.')
    assertExpectedVersion(row, input.expectedVersion)
    validateCycleStagesConfig(input.stagesConfig)
    if (input.postWindowGoalPolicy) {
      // validated by DB check; keep early message for clients
      if (
        input.postWindowGoalPolicy !== 'hard_stop' &&
        input.postWindowGoalPolicy !== 'two_tier_approval'
      ) {
        throw new HttpError(400, 'Invalid post-window goal policy.')
      }
    }

    const before = await mapCycleWithExclusions(client, row)
    const { rows } = await client.query(
      `UPDATE platform.review_cycles
       SET stages_config = $2::jsonb,
           post_window_goal_policy = COALESCE($3, post_window_goal_policy),
           version = version + 1,
           updated_by_employee_id = $4,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        cycleId,
        JSON.stringify(input.stagesConfig),
        input.postWindowGoalPolicy ?? null,
        actor.actorEmployeeId,
      ],
    )
    const cycle = mapCycle(rows[0], before.settings.excludedEmployeeIds)
    await appendActivityEvent(client, {
      eventKey: 'review_cycle.stages_updated',
      entityType: 'review_cycle',
      entityId: cycle.id,
      ...actor,
      summary: `Updated stages for ${cycle.name}`,
      changes: [
        ...fieldChanges(
          { stagesConfig: before.stagesConfig },
          { stagesConfig: cycle.stagesConfig },
          ['stagesConfig'],
        ),
        ...fieldChanges(before.settings, cycle.settings, [
          'postWindowGoalPolicy',
        ]),
      ],
      metadata: { version: cycle.version },
      source: 'api',
    })
    await client.query('COMMIT')
    return cycle
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateReviewCycleCalibration(cycleId, patch, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const row = await getCycleRow(client, cycleId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Cycle not found.')
    assertExpectedVersion(row, patch.expectedVersion)

    const before = await mapCycleWithExclusions(client, row)
    const nextCalibration = {
      ...before.calibration,
      ...patch,
      gradeDistribution: patch.gradeDistribution
        ? { ...patch.gradeDistribution }
        : before.calibration.gradeDistribution,
    }
    validateCalibration(nextCalibration)

    const { rows } = await client.query(
      `UPDATE platform.review_cycles
       SET calibration_config = $2::jsonb,
           version = version + 1,
           updated_by_employee_id = $3,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [cycleId, JSON.stringify(nextCalibration), actor.actorEmployeeId],
    )
    const cycle = mapCycle(rows[0], before.settings.excludedEmployeeIds)
    await appendActivityEvent(client, {
      eventKey: 'review_cycle.calibration_updated',
      entityType: 'review_cycle',
      entityId: cycle.id,
      ...actor,
      summary: `Updated calibration for ${cycle.name}`,
      changes: fieldChanges(
        { calibration: before.calibration },
        { calibration: cycle.calibration },
        ['calibration'],
      ),
      metadata: { version: cycle.version },
      source: 'api',
    })
    await client.query('COMMIT')
    return cycle
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteReviewCycle(cycleId, platformUser, expectedVersion) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const row = await getCycleRow(client, cycleId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Cycle not found.')
    assertExpectedVersion(row, expectedVersion)
    const before = await mapCycleWithExclusions(client, row)

    await client.query(
      `UPDATE platform.review_cycles
       SET deleted_at = now(),
           deleted_by_employee_id = $2,
           version = version + 1,
           updated_by_employee_id = $2,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [cycleId, actor.actorEmployeeId],
    )
    await appendActivityEvent(client, {
      eventKey: 'review_cycle.deleted',
      entityType: 'review_cycle',
      entityId: cycleId,
      ...actor,
      summary: `Deleted performance cycle ${before.name}`,
      metadata: {
        name: before.name,
        type: before.type,
        periodKey: before.periodKey,
        version: Number(row.version) + 1,
      },
      source: 'api',
    })
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function importReviewCycles(cycles, platformUser, fingerprint) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  const imported = []
  try {
    await client.query('BEGIN')
    for (const cycle of cycles) {
      validateGoalCountPolicy(cycle.settings.goalCountPolicy)
      validateCycleStagesConfig(cycle.stagesConfig)
      validateCalibration(cycle.calibration)
      const existing = await getCycleRow(client, cycle.id, { includeDeleted: true })
      if (existing && !existing.deleted_at) continue

      const { rows } = await client.query(
        `INSERT INTO platform.review_cycles (
           id, name, cycle_type, period_key, start_date, end_date, is_test,
           source_cycle_id, stages_config, review_types, goal_count_policy,
           post_window_goal_policy, auto_scorecard_generation, calibration_config,
           created_by_employee_id, updated_by_employee_id, created_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14::jsonb,$15,$15,$16
         )
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [
          cycle.id,
          cycle.name,
          cycle.type,
          cycle.periodKey ?? null,
          cycle.startDate,
          cycle.endDate,
          Boolean(cycle.isTest),
          null,
          JSON.stringify(cycle.stagesConfig),
          JSON.stringify(cycle.settings.reviewTypes),
          JSON.stringify(cycle.settings.goalCountPolicy),
          cycle.settings.postWindowGoalPolicy,
          Boolean(cycle.settings.autoScorecardGeneration),
          JSON.stringify(cycle.calibration),
          actor.actorEmployeeId,
          cycle.createdAt ?? new Date().toISOString(),
        ],
      )
      if (!rows[0]) continue
      const exclusions = await replaceExclusions(
        client,
        cycle.id,
        cycle.settings.excludedEmployeeIds,
      )
      const mapped = mapCycle(rows[0], exclusions)
      await appendActivityEvent(client, {
        eventKey: 'review_cycle.imported',
        entityType: 'review_cycle',
        entityId: mapped.id,
        ...actor,
        actorType: 'import',
        summary: `Imported performance cycle ${mapped.name}`,
        metadata: {
          fingerprint,
          sourceCreatedAt: cycle.createdAt,
        },
        source: 'import',
      })
      imported.push(mapped)
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
