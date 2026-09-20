import { getPool } from '../db.mjs'

/**
 * Every file in db/migrations. Boot fails if one of these was not applied,
 * so a new database is missing the schema the app queries.
 */
export const REQUIRED_MIGRATIONS = [
  '00001_platform_schema.sql',
  '00002_platform_org_and_employees.sql',
  '00003_platform_divisions.sql',
  '00004_platform_division_core.sql',
  '00005_dept_head_team_owner_nullable_join.sql',
  '00006_employees_site.sql',
  '00006_seed_hr_directory.sql',
  '00007_employees_avatar_url.sql',
  '00008_system_access_control.sql',
  '00009_notifications.sql',
  '00010_activity_events.sql',
  '00011_review_cycles.sql',
  '00012_goals.sql',
  '00013_seed_baseline_review_cycle.sql',
  '00014_activity_ledger_integrity.sql',
  '00015_goal_approval_actor.sql',
  '00016_drop_goal_classification.sql',
  '00017_milestone_list_title.sql',
  '00018_measure_group.sql',
  '00019_repair_measure_groups.sql',
  '00020_even_milestone_item_weights.sql',
  '00021_drop_goal_progress_status.sql',
  '00022_review_cycle_groups.sql',
  '00023_review_appraisal.sql',
  '00024_query_and_ledger_hardening.sql',
  '00025_relation_hardening.sql',
  '00026_manager_covers.sql',
  '00027_manager_delegations.sql',
  '00028_review_cycle_type_custom.sql',
  '00029_drop_review_cycle_purpose.sql',
  '00030_date_columns_to_timestamptz.sql',
  '00031_late_justification.sql',
  '00032_revolut_team_identity.sql',
  '00033_scorecard_forms.sql',
  '00034_skills.sql',
  '00035_values.sql',
  '00036_employees_role.sql',
  '00037_roles.sql',
  '00038_role_details.sql',
  '00039_roles_description.sql',
  '00040_scorecard_forms_cycle_type.sql',
  '00041_skills_mastery.sql',
  '00042_employee_grade_changes_and_pips.sql',
  '00043_calibration_sitting.sql',
  '00044_calibration_governance.sql',
  '00045_calibration_calibrator_scope.sql',
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
