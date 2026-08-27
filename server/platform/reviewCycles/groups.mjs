/**
 * Named people groups under a review cycle.
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'
import { cyclePurposeOf, normalizeReviewPolicy } from './reviewConfig.mjs'
import {
  normalizeStagesConfig,
  validateCalibration,
  validateCycleStagesConfig,
  validateGoalCountPolicy,
} from './validation.mjs'

function isoTimestamp(value) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function isoInstant(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  }
  const raw = String(value).trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00.000Z`
  const instant = new Date(raw)
  return Number.isNaN(instant.getTime()) ? '' : instant.toISOString()
}

function uniqueEmployeeIds(employeeIds) {
  return [...new Set((employeeIds ?? []).map(Number).filter(Number.isInteger))]
}

export function mapCycleGroup(row, memberIds = [], quarter) {
  const startDate = isoInstant(quarter?.startDate ?? row.start_date)
  const endDate = isoInstant(quarter?.endDate ?? row.end_date)
  const purpose = cyclePurposeOf({
    periodKey: quarter?.periodKey ?? row.period_key,
    type: quarter?.type ?? row.cycle_type,
  })
  return {
    id: row.id,
    cycleId: row.cycle_id,
    name: row.name,
    memberIds,
    stagesConfig: normalizeStagesConfig(row.stages_config, {
      startDate,
      endDate,
      purpose,
    }),
    settings: {
      reviewTypes: row.review_types,
      goalCountPolicy: row.goal_count_policy,
      postWindowGoalPolicy: row.post_window_goal_policy,
      excludedEmployeeIds: [],
      autoScorecardGeneration: row.auto_scorecard_generation,
      reviewPolicy: normalizeReviewPolicy(row.review_policy, purpose),
    },
    calibration: row.calibration_config,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    version: Number(row.version),
  }
}

export async function loadGroupsForCycles(client, cycleIds) {
  if (cycleIds.length === 0) return new Map()
  const { rows } = await client.query(
    `SELECT group_row.*,
            cycle.start_date,
            cycle.end_date,
            cycle.period_key,
            cycle.cycle_type
     FROM platform.review_cycle_groups group_row
     JOIN platform.review_cycles cycle ON cycle.id = group_row.cycle_id
     WHERE group_row.cycle_id = ANY($1::text[])
       AND group_row.deleted_at IS NULL
     ORDER BY group_row.created_at, group_row.name`,
    [cycleIds],
  )
  if (rows.length === 0) return new Map()

  const { rows: memberRows } = await client.query(
    `SELECT group_id, employee_id
     FROM platform.review_cycle_group_members
     WHERE group_id = ANY($1::text[])
     ORDER BY employee_id`,
    [rows.map((row) => row.id)],
  )
  const membersByGroup = new Map()
  for (const row of memberRows) {
    const list = membersByGroup.get(row.group_id) ?? []
    list.push(Number(row.employee_id))
    membersByGroup.set(row.group_id, list)
  }

  const groupsByCycle = new Map()
  for (const row of rows) {
    const group = mapCycleGroup(row, membersByGroup.get(row.id) ?? [], {
      startDate: row.start_date,
      endDate: row.end_date,
      periodKey: row.period_key,
      type: row.cycle_type,
    })
    const list = groupsByCycle.get(row.cycle_id) ?? []
    list.push(group)
    groupsByCycle.set(row.cycle_id, list)
  }
  return groupsByCycle
}

export async function replaceGroupMembers(client, cycleId, groupId, employeeIds) {
  const unique = uniqueEmployeeIds(employeeIds)
  await client.query(
    `DELETE FROM platform.review_cycle_group_members
     WHERE cycle_id = $1 AND employee_id = ANY($2::int[])`,
    [cycleId, unique],
  )
  await client.query(
    `DELETE FROM platform.review_cycle_group_members WHERE group_id = $1`,
    [groupId],
  )
  if (unique.length === 0) return unique
  await client.query(
    `INSERT INTO platform.review_cycle_group_members (group_id, cycle_id, employee_id)
     SELECT $1, $2, unnest($3::int[])`,
    [groupId, cycleId, unique],
  )
  return unique
}

export async function insertCycleGroup(client, cycleId, input, actor) {
  const name = String(input.name ?? '').trim()
  if (!name) throw new HttpError(400, 'Group name is required.')

  const stagesConfig = normalizeStagesConfig(input.stagesConfig, {
    startDate: input.startDate,
    endDate: input.endDate,
  })
  validateGoalCountPolicy(input.settings.goalCountPolicy)
  validateCycleStagesConfig(stagesConfig)
  validateCalibration(input.calibration)

  const id = input.id || `group-${crypto.randomUUID()}`
  const { rows } = await client.query(
    `INSERT INTO platform.review_cycle_groups (
       id, cycle_id, name, stages_config, review_types, goal_count_policy,
       post_window_goal_policy, auto_scorecard_generation, calibration_config,
       review_policy, created_by_employee_id, updated_by_employee_id
     ) VALUES (
       $1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7,$8,$9::jsonb,$10::jsonb,$11,$11
     )
     RETURNING *`,
    [
      id,
      cycleId,
      name,
      JSON.stringify(stagesConfig),
      JSON.stringify(input.settings.reviewTypes),
      JSON.stringify(input.settings.goalCountPolicy),
      input.settings.postWindowGoalPolicy,
      Boolean(input.settings.autoScorecardGeneration),
      JSON.stringify(input.calibration),
      JSON.stringify(
        normalizeReviewPolicy(
          input.settings.reviewPolicy,
          cyclePurposeOf({
            periodKey: input.periodKey,
            type: input.type,
          }),
        ),
      ),
      actor.actorEmployeeId,
    ],
  )
  const memberIds = await replaceGroupMembers(
    client,
    cycleId,
    id,
    input.memberIds,
  )
  const group = mapCycleGroup(rows[0], memberIds, {
    startDate: input.startDate,
    endDate: input.endDate,
    periodKey: input.periodKey,
    type: input.type,
  })
  await appendActivityEvent(client, {
    eventKey: 'review_cycle.group_created',
    entityType: 'review_cycle',
    entityId: cycleId,
    ...actor,
    summary: `Created group ${group.name}`,
    metadata: { groupId: group.id, memberCount: memberIds.length },
    source: 'api',
  })
  return group
}

export async function attachGroupsToCycles(client, cycles) {
  const byCycle = await loadGroupsForCycles(
    client,
    cycles.map((cycle) => cycle.id),
  )
  return cycles.map((cycle) => ({
    ...cycle,
    groups: byCycle.get(cycle.id) ?? [],
  }))
}

function actorFromUser(platformUser) {
  return {
    actorEmployeeId: platformUser?.employeeId ?? null,
    actorEmail: platformUser?.email ?? '',
    actorName: platformUser?.name ?? '',
  }
}

async function getGroupRow(client, cycleId, groupId, { forUpdate = false } = {}) {
  const { rows } = await client.query(
    `SELECT group_row.*, cycle.start_date, cycle.end_date,
            cycle.period_key, cycle.cycle_type
     FROM platform.review_cycle_groups group_row
     JOIN platform.review_cycles cycle ON cycle.id = group_row.cycle_id
     WHERE group_row.id = $1
       AND group_row.cycle_id = $2
       AND group_row.deleted_at IS NULL
       AND cycle.deleted_at IS NULL
     ${forUpdate ? 'FOR UPDATE OF group_row' : ''}`,
    [groupId, cycleId],
  )
  return rows[0] ?? null
}

async function loadGroup(client, cycleId, groupId) {
  const row = await getGroupRow(client, cycleId, groupId)
  if (!row) return null
  const { rows } = await client.query(
    `SELECT employee_id
     FROM platform.review_cycle_group_members
     WHERE group_id = $1
     ORDER BY employee_id`,
    [groupId],
  )
  return mapCycleGroup(
    row,
    rows.map((item) => Number(item.employee_id)),
    {
      startDate: row.start_date,
      endDate: row.end_date,
      periodKey: row.period_key,
      type: row.cycle_type,
    },
  )
}

export async function createCycleGroup(cycleId, input, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT id, start_date, end_date, period_key, cycle_type, stages_config,
              review_types, goal_count_policy, post_window_goal_policy,
              auto_scorecard_generation, calibration_config
       FROM platform.review_cycles
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [cycleId],
    )
    const cycle = rows[0]
    if (!cycle) throw new HttpError(404, 'Cycle not found.')

    const cloned = {
      name: input.name,
      memberIds: input.memberIds,
      startDate: isoInstant(cycle.start_date),
      endDate: isoInstant(cycle.end_date),
      periodKey: cycle.period_key,
      type: cycle.cycle_type,
      stagesConfig: input.stagesConfig ?? cycle.stages_config,
      settings: input.settings ?? {
        reviewTypes: cycle.review_types,
        goalCountPolicy: cycle.goal_count_policy,
        postWindowGoalPolicy: cycle.post_window_goal_policy,
        autoScorecardGeneration: cycle.auto_scorecard_generation,
      },
      calibration: input.calibration ?? cycle.calibration_config,
    }
    const group = await insertCycleGroup(client, cycleId, cloned, actor)
    await client.query('COMMIT')
    return group
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateCycleGroup(cycleId, groupId, patch, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const row = await getGroupRow(client, cycleId, groupId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Group not found.')
    if (
      patch.expectedVersion != null &&
      Number(row.version) !== Number(patch.expectedVersion)
    ) {
      throw new HttpError(409, 'Group was updated by someone else. Reload and try again.')
    }

    const before = await loadGroup(client, cycleId, groupId)
    const nextSettings = {
      reviewTypes: patch.reviewTypes
        ? { ...patch.reviewTypes, line_manager: true }
        : before.settings.reviewTypes,
      goalCountPolicy: {
        ...before.settings.goalCountPolicy,
        ...patch.goalCountPolicy,
      },
      postWindowGoalPolicy:
        patch.postWindowGoalPolicy ?? before.settings.postWindowGoalPolicy,
      autoScorecardGeneration:
        patch.autoScorecardGeneration ??
        before.settings.autoScorecardGeneration,
      reviewPolicy: normalizeReviewPolicy(
        patch.reviewPolicy ?? before.settings.reviewPolicy,
        cyclePurposeOf({
          periodKey: row.period_key,
          type: row.cycle_type,
        }),
      ),
    }
    validateGoalCountPolicy(nextSettings.goalCountPolicy)
    if (
      patch.postWindowGoalPolicy &&
      patch.postWindowGoalPolicy !== 'hard_stop' &&
      patch.postWindowGoalPolicy !== 'two_tier_approval'
    ) {
      throw new HttpError(400, 'Invalid post-window goal policy.')
    }

    const stagesConfig = patch.stagesConfig
      ? normalizeStagesConfig(patch.stagesConfig, {
          startDate: isoInstant(row.start_date),
          endDate: isoInstant(row.end_date),
        })
      : before.stagesConfig
    if (patch.stagesConfig) validateCycleStagesConfig(stagesConfig)

    const nextCalibration = patch.calibration
      ? {
          ...before.calibration,
          ...patch.calibration,
          gradeDistribution: patch.calibration.gradeDistribution
            ? { ...patch.calibration.gradeDistribution }
            : before.calibration.gradeDistribution,
        }
      : before.calibration
    if (patch.calibration) validateCalibration(nextCalibration)

    const nextName = patch.name?.trim() || before.name
    const { rows } = await client.query(
      `UPDATE platform.review_cycle_groups
       SET name = $3,
           stages_config = $4::jsonb,
           review_types = $5::jsonb,
           goal_count_policy = $6::jsonb,
           post_window_goal_policy = $7,
           auto_scorecard_generation = $8,
           calibration_config = $9::jsonb,
           review_policy = $10::jsonb,
           version = version + 1,
           updated_by_employee_id = $11,
           updated_at = now()
       WHERE id = $1 AND cycle_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [
        groupId,
        cycleId,
        nextName,
        JSON.stringify(stagesConfig),
        JSON.stringify(nextSettings.reviewTypes),
        JSON.stringify(nextSettings.goalCountPolicy),
        nextSettings.postWindowGoalPolicy,
        Boolean(nextSettings.autoScorecardGeneration),
        JSON.stringify(nextCalibration),
        JSON.stringify(nextSettings.reviewPolicy),
        actor.actorEmployeeId,
      ],
    )
    const memberIds =
      patch.memberIds != null
        ? await replaceGroupMembers(client, cycleId, groupId, patch.memberIds)
        : before.memberIds
    const group = mapCycleGroup(rows[0], memberIds, {
      startDate: row.start_date,
      endDate: row.end_date,
    })
    await appendActivityEvent(client, {
      eventKey: 'review_cycle.group_updated',
      entityType: 'review_cycle',
      entityId: cycleId,
      ...actor,
      summary: `Updated group ${group.name}`,
      metadata: { groupId: group.id, version: group.version },
      source: 'api',
    })
    await client.query('COMMIT')
    return group
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteCycleGroup(cycleId, groupId, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const row = await getGroupRow(client, cycleId, groupId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Group not found.')
    await client.query(
      `UPDATE platform.review_cycle_groups
       SET deleted_at = now(),
           deleted_by_employee_id = $3,
           version = version + 1,
           updated_by_employee_id = $3,
           updated_at = now()
       WHERE id = $1 AND cycle_id = $2 AND deleted_at IS NULL`,
      [groupId, cycleId, actor.actorEmployeeId],
    )
    await client.query(
      `DELETE FROM platform.review_cycle_group_members WHERE group_id = $1`,
      [groupId],
    )
    await appendActivityEvent(client, {
      eventKey: 'review_cycle.group_deleted',
      entityType: 'review_cycle',
      entityId: cycleId,
      ...actor,
      summary: `Deleted group ${row.name}`,
      metadata: { groupId },
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

export async function copyCycleGroups(sourceCycleId, targetCycleId, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const { rows: targetRows } = await client.query(
      `SELECT start_date, end_date FROM platform.review_cycles
       WHERE id = $1 AND deleted_at IS NULL`,
      [targetCycleId],
    )
    if (!targetRows[0]) throw new HttpError(404, 'Cycle not found.')
    const groupsByCycle = await loadGroupsForCycles(client, [sourceCycleId])
    const sourceGroups = groupsByCycle.get(sourceCycleId) ?? []
    for (const group of sourceGroups) {
      await insertCycleGroup(
        client,
        targetCycleId,
        {
          name: group.name,
          memberIds: group.memberIds,
          startDate: isoInstant(targetRows[0].start_date),
          endDate: isoInstant(targetRows[0].end_date),
          stagesConfig: group.stagesConfig,
          settings: group.settings,
          calibration: group.calibration,
        },
        actor,
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
