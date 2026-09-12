/**
 * Align stored gradeGoals / gradeOverall with product defaults:
 *   Q1–Q3 → goals on, overall off
 *   Q4    → both off
 *   Annual → both on
 * Custom / other cycles are left alone.
 *
 * Run inside the platform API container:
 *   node platform/scripts/patchGradeDefaults.mjs
 */
import { getPool } from '../../db.mjs'
import {
  defaultReviewPolicy,
  cyclePurposeOf,
} from '../reviewCycles/reviewConfig.mjs'

function gradingFor(periodKey, cycleType) {
  const purpose = cyclePurposeOf({ periodKey, type: cycleType })
  if (
    purpose !== 'quarterly_checkin' &&
    purpose !== 'annual_appraisal'
  ) {
    return null
  }
  const defaults = defaultReviewPolicy(purpose, periodKey)
  return {
    gradeGoals: defaults.managerReview.gradeGoals,
    gradeOverall: defaults.managerReview.gradeOverall,
  }
}

function applyGrading(policy, grading) {
  const base =
    policy && typeof policy === 'object' && !Array.isArray(policy)
      ? structuredClone(policy)
      : {}
  const managerReview =
    base.managerReview && typeof base.managerReview === 'object'
      ? { ...base.managerReview }
      : {}
  managerReview.gradeGoals = grading.gradeGoals
  managerReview.gradeOverall = grading.gradeOverall
  return { ...base, managerReview }
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
      const grading = gradingFor(row.period_key, row.cycle_type)
      if (!grading) continue
      const current = row.review_policy?.managerReview ?? {}
      if (
        current.gradeGoals === grading.gradeGoals &&
        current.gradeOverall === grading.gradeOverall
      ) {
        continue
      }
      const next = applyGrading(row.review_policy, grading)
      await client.query(
        `UPDATE platform.review_cycles
         SET review_policy = $2::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [row.id, JSON.stringify(next)],
      )
      cyclesUpdated += 1
      console.log(
        `cycle ${row.id}: goals=${grading.gradeGoals} overall=${grading.gradeOverall}`,
      )
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
      const grading = gradingFor(row.period_key, row.cycle_type)
      if (!grading) continue
      const current = row.review_policy?.managerReview ?? {}
      if (
        current.gradeGoals === grading.gradeGoals &&
        current.gradeOverall === grading.gradeOverall
      ) {
        continue
      }
      const next = applyGrading(row.review_policy, grading)
      await client.query(
        `UPDATE platform.review_cycle_groups
         SET review_policy = $2::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [row.id, JSON.stringify(next)],
      )
      groupsUpdated += 1
      console.log(
        `group ${row.name} (${row.cycle_id}): goals=${grading.gradeGoals} overall=${grading.gradeOverall}`,
      )
    }

    await client.query('COMMIT')
    console.log(
      JSON.stringify({ cyclesUpdated, groupsUpdated }, null, 2),
    )
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
