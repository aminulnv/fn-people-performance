/**
 * Server-side Activity Log visibility.
 * UI may hide entry points; this module decides what rows are returned.
 */

import { getPool } from '../db.mjs'
import { permissionsForPlatformUser } from './auth.mjs'

/**
 * @param {{ email?: string, employeeId?: number | null, permissions?: string[] }} platformUser
 */
export async function loadActivityViewerContext(platformUser) {
  const permissions =
    platformUser.permissions ??
    (await permissionsForPlatformUser(platformUser))
  const employeeId =
    platformUser.employeeId == null ? null : Number(platformUser.employeeId)

  let reportIds = new Set()
  let skipLevelIds = new Set()

  if (Number.isInteger(employeeId)) {
    const { rows } = await getPool().query(
      `WITH direct AS (
         SELECT employee_id
         FROM platform.employees
         WHERE reports_to_employee_id = $1
       ),
       skip AS (
         SELECT e.employee_id
         FROM platform.employees e
         JOIN direct d ON e.reports_to_employee_id = d.employee_id
       )
       SELECT 'direct'::text AS kind, employee_id FROM direct
       UNION ALL
       SELECT 'skip'::text AS kind, employee_id FROM skip`,
      [employeeId],
    )
    for (const row of rows) {
      if (row.kind === 'direct') reportIds.add(Number(row.employee_id))
      if (row.kind === 'skip') skipLevelIds.add(Number(row.employee_id))
    }
  }

  return {
    employeeId,
    permissions: new Set(permissions),
    reportIds,
    skipLevelIds,
  }
}

/**
 * @param {Awaited<ReturnType<typeof loadActivityViewerContext>>} viewer
 * @param {{
 *   eventKey: string
 *   entityType: string
 *   subjectEmployeeId?: number
 *   actorEmployeeId?: number
 * }} event
 */
export function canViewActivityRow(viewer, event) {
  if (viewer.permissions.has('activity.read_all')) return true
  if (viewer.permissions.has('platform.read_all')) {
    if (event.entityType === 'access' && !viewer.permissions.has('access.manage')) {
      return false
    }
    return true
  }

  if (event.entityType === 'access') {
    return viewer.permissions.has('access.manage')
  }

  const subjectId = event.subjectEmployeeId
  if (subjectId == null) return false
  if (viewer.employeeId != null && subjectId === viewer.employeeId) return true
  if (viewer.reportIds.has(subjectId)) return true

  // Skip-level managers only see late/final approval footprints for people
  // already in their view scope.
  if (
    viewer.skipLevelIds.has(subjectId) &&
    (event.eventKey.includes('final_approved') ||
      event.eventKey.includes('manager_manager') ||
      event.eventKey.includes('submitted') ||
      event.eventKey.includes('sent_back'))
  ) {
    return true
  }

  return false
}
