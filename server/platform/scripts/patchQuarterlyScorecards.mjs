/**
 * Align quarterly (and custom) scorecards with product defaults:
 *   Goals only — Skills and Core Values off.
 * Also refreshes Q1–Q3 / Q4 grade switches and quarterly questions.
 * Annual cycles are left alone.
 *
 * Run inside the platform API container:
 *   node platform/scripts/patchQuarterlyScorecards.mjs
 */
import { getPool } from '../../db.mjs'
import {
  defaultReviewPolicy,
  cyclePurposeOf,
} from '../reviewCycles/reviewConfig.mjs'

function shouldPatch(periodKey, cycleType) {
  const purpose = cyclePurposeOf({ periodKey, type: cycleType })
  return purpose === 'quarterly_checkin'
}

function applyQuarterlyDefaults(policy, periodKey, cycleType) {
  const purpose = cyclePurposeOf({ periodKey, type: cycleType })
  const defaults = defaultReviewPolicy(purpose, periodKey)
  const base =
    policy && typeof policy === 'object' && !Array.isArray(policy)
      ? structuredClone(policy)
      : {}
  const managerReview =
    base.managerReview && typeof base.managerReview === 'object'
      ? { ...base.managerReview }
      : { ...defaults.managerReview }

  managerReview.gradeGoals = defaults.managerReview.gradeGoals
  managerReview.gradeOverall = defaults.managerReview.gradeOverall

  return {
    ...defaults,
    ...base,
    selfReview: {
      ...defaults.selfReview,
      ...(base.selfReview && typeof base.selfReview === 'object'
        ? base.selfReview
        : {}),
      ratePillars: defaults.selfReview.ratePillars,
      rateOverall: defaults.selfReview.rateOverall,
    },
    managerReview,
    scorecard: {
      ...defaults.scorecard,
      ...(base.scorecard && typeof base.scorecard === 'object'
        ? { bands: base.scorecard.bands ?? defaults.scorecard.bands }
        : {}),
      pillars: defaults.scorecard.pillars,
      questions: defaults.scorecard.questions,
      extraGradeFields: defaults.scorecard.extraGradeFields,
    },
  }
}

function pillarsNeedPatch(policy) {
  const pillars = policy?.scorecard?.pillars
  if (!Array.isArray(pillars) || pillars.length === 0) return true
  const enabled = pillars.filter((pillar) => pillar.enabled)
  if (enabled.length !== 1 || enabled[0]?.kind !== 'goals') return true
  if (Number(enabled[0]?.weight) !== 100) return true
  const skills = pillars.find((pillar) => pillar.kind === 'skills')
  const values = pillars.find((pillar) => pillar.kind === 'values')
  if (skills?.enabled || values?.enabled) return true
  return false
}

async function main() {
  const pool = getPool()
  const client = await pool.connect()
  let cyclesUpdated = 0
  let groupsUpdated = 0
  try {
    await client.query('BEGIN')

    const { rows: cycles } = await client.query(
      `SELECT id, period_key, cycle_type, review_policy
       FROM platform.review_cycles
       WHERE deleted_at IS NULL`,
    )

    for (const row of cycles) {
      if (!shouldPatch(row.period_key, row.cycle_type)) continue
      if (!pillarsNeedPatch(row.review_policy)) continue
      const next = applyQuarterlyDefaults(
        row.review_policy,
        row.period_key,
        row.cycle_type,
      )
      await client.query(
        `UPDATE platform.review_cycles
         SET review_policy = $2::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [row.id, JSON.stringify(next)],
      )
      cyclesUpdated += 1
      console.log(`cycle ${row.id}: goals-only scorecard`)
    }

    const { rows: groups } = await client.query(
      `SELECT g.id, g.cycle_id, g.name, g.review_policy,
              c.period_key, c.cycle_type
       FROM platform.review_cycle_groups g
       JOIN platform.review_cycles c ON c.id = g.cycle_id
       WHERE g.deleted_at IS NULL
         AND c.deleted_at IS NULL`,
    )

    for (const row of groups) {
      if (!shouldPatch(row.period_key, row.cycle_type)) continue
      if (!pillarsNeedPatch(row.review_policy)) continue
      const next = applyQuarterlyDefaults(
        row.review_policy,
        row.period_key,
        row.cycle_type,
      )
      await client.query(
        `UPDATE platform.review_cycle_groups
         SET review_policy = $2::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [row.id, JSON.stringify(next)],
      )
      groupsUpdated += 1
      console.log(`group ${row.name} (${row.cycle_id}): goals-only scorecard`)
    }

    await client.query('COMMIT')
    console.log(JSON.stringify({ cyclesUpdated, groupsUpdated }, null, 2))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
