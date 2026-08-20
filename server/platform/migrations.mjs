import { getPool } from '../db.mjs'

const REQUIRED_MIGRATIONS = [
  '00010_activity_events.sql',
  '00011_review_cycles.sql',
  '00012_goals.sql',
  '00013_seed_baseline_review_cycle.sql',
  '00014_activity_ledger_integrity.sql',
  '00015_goal_approval_actor.sql',
  '00022_review_cycle_groups.sql',
]

export async function assertPlatformMigrations() {
  const { rows } = await getPool().query(
    `SELECT id
     FROM platform.schema_migrations
     WHERE id = ANY($1::text[])`,
    [REQUIRED_MIGRATIONS],
  )
  const applied = new Set(rows.map((row) => row.id))
  const missing = REQUIRED_MIGRATIONS.filter((id) => !applied.has(id))
  if (missing.length > 0) {
    throw new Error(
      `Required platform migrations are missing: ${missing.join(', ')}`,
    )
  }
}
