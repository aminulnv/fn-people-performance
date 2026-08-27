/**
 * Authoritative cycle persistence with transactional Activity writes.
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'
import { attachGroupsToCycles } from './groups.mjs'
import {
  cyclePurposeOf,
  inferYearKey,
  normalizeReviewPolicy,
} from './reviewConfig.mjs'
import {
  validateCalibration,
  validateCycleDateRange,
  validateCycleStagesConfig,
  validateGoalCountPolicy,
  normalizeStagesConfig,
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

function actorFromUser(platformUser) {
  return {
    actorEmployeeId: platformUser?.employeeId ?? null,
    actorEmail: platformUser?.email ?? '',
    actorName: platformUser?.name ?? '',
  }
}

function normalizeCycleType(type) {
  return type === 'custom' || type === 'ad-hoc' ? 'custom' : 'regular'
}

function isCycleTypeCheckError(err) {
  const message = err instanceof Error ? err.message : String(err)
  return /review_cycles_cycle_type_check/.test(message)
}

function mapCycle(row, excludedEmployeeIds = [], sourceLinks = []) {
  const startDate = isoInstant(row.start_date)
  const endDate = isoInstant(row.end_date)
  const type = normalizeCycleType(row.cycle_type)
  const purpose = cyclePurposeOf({ periodKey: row.period_key, type })
  return {
    id: row.id,
    name: row.name,
    type,
    startDate,
    endDate,
    periodKey: row.period_key ?? undefined,
    yearKey: row.year_key ?? inferYearKey(row.period_key, startDate) ?? undefined,
    sourceLinks,
    stagesConfig: normalizeStagesConfig(row.stages_config, {
      startDate,
      endDate,
      purpose,
    }),
    settings: {
      reviewTypes: row.review_types,
      goalCountPolicy: row.goal_count_policy,
      postWindowGoalPolicy: row.post_window_goal_policy,
      excludedEmployeeIds,
      autoScorecardGeneration: row.auto_scorecard_generation,
      reviewPolicy: normalizeReviewPolicy(row.review_policy, purpose),
    },
    calibration: row.calibration_config,
    groups: [],
    isTest: row.is_test || undefined,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    version: Number(row.version),
  }
}

async function loadSourceLinks(client, cycleId) {
  const { rows } = await client.query(
    `SELECT source_cycle_id, weight_percent, excluded
     FROM platform.review_cycle_sources
     WHERE cycle_id = $1
     ORDER BY sort_order, source_cycle_id`,
    [cycleId],
  )
  return rows.map((row) => ({
    sourceCycleId: row.source_cycle_id,
    weightPercent: Number(row.weight_percent),
    excluded: Boolean(row.excluded),
  }))
}

async function replaceSourceLinks(client, cycleId, links) {
  const next = Array.isArray(links) ? links : []
  await client.query(
    `DELETE FROM platform.review_cycle_sources WHERE cycle_id = $1`,
    [cycleId],
  )
  for (const [index, link] of next.entries()) {
    if (!link?.sourceCycleId) continue
    await client.query(
      `INSERT INTO platform.review_cycle_sources (
         cycle_id, source_cycle_id, weight_percent, excluded, transition_grade, sort_order
       ) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (cycle_id, source_cycle_id) DO UPDATE
       SET weight_percent = EXCLUDED.weight_percent,
           excluded = EXCLUDED.excluded,
           transition_grade = EXCLUDED.transition_grade,
           sort_order = EXCLUDED.sort_order`,
      [
        cycleId,
        link.sourceCycleId,
        Number.isInteger(link.weightPercent) ? link.weightPercent : 25,
        Boolean(link.excluded),
        null,
        index,
      ],
    )
  }
  return loadSourceLinks(client, cycleId)
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

function sameEmployeeIds(left, right) {
  if (left.length !== right.length) return false
  const sortedLeft = [...left].sort((a, b) => a - b)
  const sortedRight = [...right].sort((a, b) => a - b)
  return sortedLeft.every((id, index) => id === sortedRight[index])
}

async function replaceExclusions(client, cycleId, employeeIds, currentIds) {
  const unique = [
    ...new Set((employeeIds ?? []).map(Number).filter(Number.isInteger)),
  ]
  const existing = currentIds ?? (await loadExclusions(client, cycleId))
  if (sameEmployeeIds(existing, unique)) return unique

  await client.query(
    `DELETE FROM platform.review_cycle_grade_exclusions WHERE cycle_id = $1`,
    [cycleId],
  )
  if (unique.length === 0) return unique
  await client.query(
    `INSERT INTO platform.review_cycle_grade_exclusions (cycle_id, employee_id)
     SELECT $1, unnest($2::int[])
     ON CONFLICT DO NOTHING`,
    [cycleId, unique],
  )
  return unique
}

async function allocateCycleId(client, preferredId) {
  const existing = await getCycleRow(client, preferredId, { includeDeleted: true })
  if (!existing) return preferredId
  if (!existing.deleted_at) {
    throw new HttpError(409, 'A cycle for this period already exists.')
  }
  return `${preferredId}-${crypto.randomUUID().slice(0, 8)}`
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
  const sourceLinks = await loadSourceLinks(client, row.id)
  return mapCycle(row, exclusions, sourceLinks)
}

async function withAttachedGroups(client, cycle) {
  if (!cycle) return null
  const [next] = await attachGroupsToCycles(client, [cycle])
  return next
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
    if (rows.length === 0) return []

    const { rows: exclusionRows } = await client.query(
      `SELECT cycle_id, employee_id
       FROM platform.review_cycle_grade_exclusions
       WHERE cycle_id = ANY($1::text[])
       ORDER BY employee_id`,
      [rows.map((row) => row.id)],
    )
    const exclusionsByCycle = new Map()
    for (const row of exclusionRows) {
      const list = exclusionsByCycle.get(row.cycle_id) ?? []
      list.push(Number(row.employee_id))
      exclusionsByCycle.set(row.cycle_id, list)
    }
    const { rows: sourceRows } = await client.query(
      `SELECT cycle_id, source_cycle_id, weight_percent, excluded
       FROM platform.review_cycle_sources
       WHERE cycle_id = ANY($1::text[])
       ORDER BY sort_order, source_cycle_id`,
      [rows.map((row) => row.id)],
    )
    const sourcesByCycle = new Map()
    for (const row of sourceRows) {
      const list = sourcesByCycle.get(row.cycle_id) ?? []
      list.push({
        sourceCycleId: row.source_cycle_id,
        weightPercent: Number(row.weight_percent),
        excluded: Boolean(row.excluded),
      })
      sourcesByCycle.set(row.cycle_id, list)
    }
    const cycles = rows.map((row) =>
      mapCycle(
        row,
        exclusionsByCycle.get(row.id) ?? [],
        sourcesByCycle.get(row.id) ?? [],
      ),
    )
    return attachGroupsToCycles(client, cycles)
  } finally {
    client.release()
  }
}

export async function getReviewCycle(cycleId) {
  const client = await getPool().connect()
  try {
    const row = await getCycleRow(client, cycleId)
    const cycle = await mapCycleWithExclusions(client, row)
    return withAttachedGroups(client, cycle)
  } finally {
    client.release()
  }
}

export async function createReviewCycle(input, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const type = normalizeCycleType(input.type)
    const purpose = cyclePurposeOf({
      periodKey: input.periodKey,
      type,
    })
    const stagesConfig = normalizeStagesConfig(input.stagesConfig, {
      startDate: input.startDate,
      endDate: input.endDate,
      purpose,
      periodKey: input.periodKey,
    })
    validateGoalCountPolicy(input.settings.goalCountPolicy)
    validateCycleDateRange(input.startDate, input.endDate)
    validateCycleStagesConfig(stagesConfig)
    validateCalibration(input.calibration)
    const reviewPolicy = normalizeReviewPolicy(
      input.settings.reviewPolicy,
      purpose,
    )

    const id = await allocateCycleId(
      client,
      input.id || input.periodKey || `custom-${crypto.randomUUID()}`,
    )
    const insertSql = `INSERT INTO platform.review_cycles (
         id, name, cycle_type, period_key, start_date, end_date, is_test,
         stages_config, review_types, goal_count_policy,
         post_window_goal_policy, auto_scorecard_generation, calibration_config,
         year_key, review_policy,
         created_by_employee_id, updated_by_employee_id
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13::jsonb,$14,$15::jsonb,$16,$16
       )
       RETURNING *`
    const insertValues = (cycleType) => [
      id,
      input.name,
      cycleType,
      input.periodKey ?? null,
      input.startDate,
      input.endDate,
      Boolean(input.isTest),
      JSON.stringify(stagesConfig),
      JSON.stringify(input.settings.reviewTypes),
      JSON.stringify(input.settings.goalCountPolicy),
      input.settings.postWindowGoalPolicy,
      Boolean(input.settings.autoScorecardGeneration),
      JSON.stringify(input.calibration),
      input.yearKey ?? inferYearKey(input.periodKey, input.startDate),
      JSON.stringify(reviewPolicy),
      actor.actorEmployeeId,
    ]
    const typesToTry = type === 'custom' ? ['custom', 'ad-hoc'] : [type]
    let rows
    let lastInsertError
    for (const cycleType of typesToTry) {
      await client.query('SAVEPOINT cycle_type_insert')
      try {
        ;({ rows } = await client.query(insertSql, insertValues(cycleType)))
        lastInsertError = null
        await client.query('RELEASE SAVEPOINT cycle_type_insert')
        break
      } catch (err) {
        lastInsertError = err
        await client.query('ROLLBACK TO SAVEPOINT cycle_type_insert')
        if (!isCycleTypeCheckError(err)) throw err
      }
    }
    if (!rows?.length) throw lastInsertError
    const exclusions = await replaceExclusions(
      client,
      id,
      input.settings.excludedEmployeeIds,
    )
    const sourceLinks = await replaceSourceLinks(client, id, input.sourceLinks)
    const created = mapCycle(rows[0], exclusions, sourceLinks)
    const cycle = await withAttachedGroups(client, created)
    await appendActivityEvent(client, {
      eventKey: input.isTest ? 'review_cycle.test_created' : 'review_cycle.created',
      entityType: 'review_cycle',
      entityId: cycle.id,
      ...actor,
      summary: input.isTest
        ? `Created test cycle ${cycle.name}`
        : `Created cycle ${cycle.name}`,
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

function assertPostWindowGoalPolicy(policy) {
  if (!policy) return
  if (policy !== 'hard_stop' && policy !== 'two_tier_approval') {
    throw new HttpError(400, 'Invalid post-window goal policy.')
  }
}

export async function updateReviewCycle(cycleId, patch, platformUser) {
  const client = await getPool().connect()
  const actor = actorFromUser(platformUser)
  try {
    await client.query('BEGIN')
    const row = await getCycleRow(client, cycleId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Cycle not found.')
    assertExpectedVersion(row, patch.expectedVersion)

    const before = await mapCycleWithExclusions(client, row)
    const nextPurpose = cyclePurposeOf({
      periodKey: before.periodKey,
      type: before.type,
    })
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
      excludedEmployeeIds:
        patch.excludedEmployeeIds ?? before.settings.excludedEmployeeIds,
      autoScorecardGeneration:
        patch.autoScorecardGeneration ??
        before.settings.autoScorecardGeneration,
      reviewPolicy: normalizeReviewPolicy(
        patch.reviewPolicy ?? before.settings.reviewPolicy,
        nextPurpose,
      ),
    }
    validateGoalCountPolicy(nextSettings.goalCountPolicy)
    assertPostWindowGoalPolicy(patch.postWindowGoalPolicy)

    const stagesConfig = patch.stagesConfig
      ? normalizeStagesConfig(patch.stagesConfig, {
          startDate: isoInstant(row.start_date),
          endDate: isoInstant(row.end_date),
          purpose: nextPurpose,
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
    const nextStartDate = patch.startDate ?? before.startDate
    const nextEndDate = patch.endDate ?? before.endDate
    validateCycleDateRange(nextStartDate, nextEndDate)
    const nextYearKey = patch.yearKey ?? before.yearKey ?? null
    const headerChanged =
      nextName !== before.name ||
      nextStartDate !== before.startDate ||
      nextEndDate !== before.endDate ||
      nextYearKey !== (before.yearKey ?? null)
    const settingsChanged =
      fieldChanges(before.settings, nextSettings, [
        'reviewTypes',
        'goalCountPolicy',
        'postWindowGoalPolicy',
        'excludedEmployeeIds',
        'autoScorecardGeneration',
        'reviewPolicy',
      ]).length > 0
    const sourcesChanged =
      patch.sourceLinks != null &&
      JSON.stringify(patch.sourceLinks) !== JSON.stringify(before.sourceLinks)
    const stagesChanged =
      JSON.stringify(before.stagesConfig) !== JSON.stringify(stagesConfig)
    const calibrationChanged =
      JSON.stringify(before.calibration) !== JSON.stringify(nextCalibration)

    if (
      !headerChanged &&
      !settingsChanged &&
      !stagesChanged &&
      !calibrationChanged &&
      !sourcesChanged
    ) {
      await client.query('COMMIT')
      return withAttachedGroups(client, before)
    }

    const { rows } = await client.query(
      `UPDATE platform.review_cycles
       SET name = $2,
           start_date = $3,
           end_date = $4,
           review_types = $5::jsonb,
           goal_count_policy = $6::jsonb,
           post_window_goal_policy = $7,
           auto_scorecard_generation = $8,
           stages_config = $9::jsonb,
           calibration_config = $10::jsonb,
           year_key = $11,
           review_policy = $12::jsonb,
           version = version + 1,
           updated_by_employee_id = $13,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        cycleId,
        nextName,
        nextStartDate,
        nextEndDate,
        JSON.stringify(nextSettings.reviewTypes),
        JSON.stringify(nextSettings.goalCountPolicy),
        nextSettings.postWindowGoalPolicy,
        Boolean(nextSettings.autoScorecardGeneration),
        JSON.stringify(stagesConfig),
        JSON.stringify(nextCalibration),
        nextYearKey,
        JSON.stringify(nextSettings.reviewPolicy),
        actor.actorEmployeeId,
      ],
    )
    const exclusions =
      patch.excludedEmployeeIds != null
        ? await replaceExclusions(
            client,
            cycleId,
            nextSettings.excludedEmployeeIds,
            before.settings.excludedEmployeeIds,
          )
        : before.settings.excludedEmployeeIds
    const sourceLinks =
      patch.sourceLinks != null
        ? await replaceSourceLinks(client, cycleId, patch.sourceLinks)
        : before.sourceLinks
    const cycle = mapCycle(rows[0], exclusions, sourceLinks)

    if (headerChanged || settingsChanged) {
      await appendActivityEvent(client, {
        eventKey: 'review_cycle.settings_updated',
        entityType: 'review_cycle',
        entityId: cycle.id,
        ...actor,
        summary: `Updated settings for ${cycle.name}`,
        changes: fieldChanges(before, cycle, [
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
        ),
        metadata: { version: cycle.version },
        source: 'api',
      })
    }
    if (stagesChanged) {
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
    }
    if (calibrationChanged) {
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
    }

    await client.query('COMMIT')
    return withAttachedGroups(client, cycle)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateReviewCycleSettings(cycleId, patch, platformUser) {
  return updateReviewCycle(cycleId, patch, platformUser)
}

export async function updateReviewCycleStages(cycleId, input, platformUser) {
  return updateReviewCycle(
    cycleId,
    {
      stagesConfig: input.stagesConfig,
      postWindowGoalPolicy: input.postWindowGoalPolicy,
      expectedVersion: input.expectedVersion,
    },
    platformUser,
  )
}

export async function updateReviewCycleCalibration(cycleId, patch, platformUser) {
  const { expectedVersion, ...calibration } = patch
  return updateReviewCycle(
    cycleId,
    { calibration, expectedVersion },
    platformUser,
  )
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
      summary: `Deleted cycle ${before.name}`,
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
      const stagesConfig = normalizeStagesConfig(cycle.stagesConfig, {
        startDate: cycle.startDate,
        endDate: cycle.endDate,
      })
      validateGoalCountPolicy(cycle.settings.goalCountPolicy)
      validateCycleStagesConfig(stagesConfig)
      validateCalibration(cycle.calibration)
      const existing = await getCycleRow(client, cycle.id, { includeDeleted: true })
      if (existing && !existing.deleted_at) continue

      const { rows } = await client.query(
        `INSERT INTO platform.review_cycles (
           id, name, cycle_type, period_key, start_date, end_date, is_test,
           stages_config, review_types, goal_count_policy,
           post_window_goal_policy, auto_scorecard_generation, calibration_config,
           created_by_employee_id, updated_by_employee_id, created_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13::jsonb,$14,$14,$15
         )
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [
          cycle.id,
          cycle.name,
          normalizeCycleType(cycle.type),
          cycle.periodKey ?? null,
          cycle.startDate,
          cycle.endDate,
          Boolean(cycle.isTest),
          JSON.stringify(stagesConfig),
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
        summary: `Imported cycle ${mapped.name}`,
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
