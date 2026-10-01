/**
 * Scheduled actions driven by cycle / group stage windows.
 * Dates are stored as UTC wall-clock (`YYYY-MM-DD` + `HH:mm`), same as toUtcIso.
 */

import { getPool } from '../../db.mjs'
import { getCalibrationSitting, lockCalibrationSession } from '../calibrationSession.mjs'
import {
  forceMoveMissedManagerReviewsForCycle,
  releaseReviewPackets,
} from '../reviewPackets/store.mjs'


export const SCHEDULER_ACTOR = {
  employeeId: null,
  email: 'scheduler@platform',
  name: 'Platform scheduler',
  scheduled: true,
}

/** Parse stage { date, time } into a UTC Date, or null if incomplete. */
export function stageInstantUtc(edge) {
  if (!edge) return null
  const date = String(edge.date ?? '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const rawTime = String(edge.time ?? '00:00').trim()
  const time = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : '00:00'
  const instant = new Date(`${date}T${time}:00.000Z`)
  return Number.isNaN(instant.getTime()) ? null : instant
}

/** End of calendar day UTC for date-only stage ends (manager / calibration). */
export function stageEndOfDayUtc(edge) {
  const date = String(edge?.date ?? '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const instant = new Date(`${date}T23:59:59.999Z`)
  return Number.isNaN(instant.getTime()) ? null : instant
}

export function stageIsDue(edge, now = new Date(), { endOfDay = false } = {}) {
  const when = endOfDay ? stageEndOfDayUtc(edge) : stageInstantUtc(edge)
  if (!when) return false
  return now.getTime() >= when.getTime()
}

function reviewStagesOf(stagesConfig) {
  return Array.isArray(stagesConfig?.reviewStages) ? stagesConfig.reviewStages : []
}

function findStage(stagesConfig, stageId) {
  return reviewStagesOf(stagesConfig).find((stage) => stage.id === stageId) ?? null
}

/**
 * Force-move unfinished manager reviews past the manager_review end date.
 */
export async function runScheduledManagerForceMoves({ now = new Date() } = {}) {
  const summary = { cycles: 0, packets: 0 }
  const { rows } = await getPool().query(
    `SELECT id, stages_config
     FROM platform.review_cycles
     WHERE deleted_at IS NULL`,
  )
  for (const row of rows) {
    const cycle = {
      id: row.id,
      stagesConfig: row.stages_config ?? {},
    }
    const moved = await forceMoveMissedManagerReviewsForCycle(cycle, now)
    summary.cycles += 1
    summary.packets += moved
  }
  return summary
}

/**
 * Auto-release publish_managers / publish_employees when their Goes-live time passes.
 */
export async function runScheduledPublishReleases({ now = new Date() } = {}) {
  const summary = {
    groupsChecked: 0,
    managersReleased: 0,
    employeesReleased: 0,
    errors: [],
  }
  const { rows } = await getPool().query(
    `SELECT
       c.id AS cycle_id,
       g.id AS group_id,
       g.stages_config
     FROM platform.review_cycles c
     INNER JOIN platform.review_cycle_groups g ON g.cycle_id = c.id
     WHERE c.deleted_at IS NULL
       AND g.deleted_at IS NULL`,
  )

  for (const row of rows) {
    summary.groupsChecked += 1
    const stagesConfig = row.stages_config ?? {}
    const targets = [
      { stageId: 'publish_managers', target: 'managers', key: 'managersReleased' },
      { stageId: 'publish_employees', target: 'employees', key: 'employeesReleased' },
    ]
    for (const item of targets) {
      const stage = findStage(stagesConfig, item.stageId)
      if (!stage?.enabled) continue
      if (!stageIsDue(stage.start, now)) continue
      try {
        const before = await countReleasablePackets(
          row.cycle_id,
          row.group_id,
          item.target,
        )
        if (before === 0) continue
        await releaseReviewPackets(
          row.cycle_id,
          row.group_id,
          item.target,
          SCHEDULER_ACTOR,
        )
        summary[item.key] += before
      } catch (error) {
        summary.errors.push({
          cycleId: row.cycle_id,
          groupId: row.group_id,
          target: item.target,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
  return summary
}

async function countReleasablePackets(cycleId, groupId, target) {
  const toManagers = target === 'managers'
  const statusFilter = toManagers
    ? `AND status NOT IN ('released_to_managers', 'released_to_employees', 'appealed')`
    : `AND status NOT IN ('released_to_employees', 'appealed')`
  const exclusion =
    target === 'employees'
      ? `AND NOT EXISTS (
           SELECT 1
           FROM platform.review_cycle_grade_exclusions exclusion
           WHERE exclusion.cycle_id = platform.review_packets.cycle_id
             AND exclusion.employee_id = platform.review_packets.employee_id
         )`
      : ''
  const { rows } = await getPool().query(
    `SELECT count(*)::int AS n
     FROM platform.review_packets
     WHERE cycle_id = $1
       AND COALESCE(calibrated_overall_grade, manager_overall_grade) IS NOT NULL
       AND employee_id IN (
         SELECT employee_id
         FROM platform.review_cycle_group_members
         WHERE group_id = $2 AND cycle_id = $1
       )
       ${statusFilter}
       ${exclusion}`,
    [cycleId, groupId],
  )
  return Number(rows[0]?.n ?? 0)
}

/**
 * Lock calibration sittings after the latest enabled calibration stage end.
 */
export async function runScheduledCalibrationLocks({ now = new Date() } = {}) {
  const summary = { cyclesChecked: 0, locked: 0 }
  const { rows } = await getPool().query(
    `SELECT c.id AS cycle_id, g.stages_config
     FROM platform.review_cycles c
     INNER JOIN platform.review_cycle_groups g ON g.cycle_id = c.id
     WHERE c.deleted_at IS NULL
       AND g.deleted_at IS NULL`,
  )

  const byCycle = new Map()
  for (const row of rows) {
    const list = byCycle.get(row.cycle_id) ?? []
    list.push(row.stages_config ?? {})
    byCycle.set(row.cycle_id, list)
  }

  for (const [cycleId, configs] of byCycle) {
    summary.cyclesChecked += 1
    let due = false
    for (const stagesConfig of configs) {
      for (const stageId of ['calibration']) {
        const stage = findStage(stagesConfig, stageId)
        if (!stage?.enabled) continue
        if (stageIsDue(stage.end ?? stage.start, now, { endOfDay: true })) {
          due = true
        }
      }
    }
    if (!due) continue
    const before = await getCalibrationSitting(cycleId)
    if (before.lockedAt) continue
    await lockCalibrationSession(cycleId, null)
    summary.locked += 1
  }
  return summary
}
