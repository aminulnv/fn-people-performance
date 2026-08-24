import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { permissionsForPlatformUser } from '../auth.mjs'
import { listActiveDelegatedManagerIds } from '../delegations.mjs'

function employeeIdFor(user) {
  const employeeId = Number(user?.employeeId)
  if (!Number.isInteger(employeeId)) {
    throw new HttpError(403, 'A signed-in employee is required')
  }
  return employeeId
}

async function loadGoalAccessContext(user, cycleId, subjectEmployeeId) {
  const actorEmployeeId = employeeIdFor(user)
  const permissions = new Set(await permissionsForPlatformUser(user))
  const { rows } = await getPool().query(
    `SELECT
       subject.employee_id,
       subject.reports_to_employee_id,
       manager.reports_to_employee_id AS skip_level_employee_id,
       submission.post_window_approval_stage
     FROM platform.employees subject
     LEFT JOIN platform.employees manager
       ON manager.employee_id = subject.reports_to_employee_id
     LEFT JOIN platform.goal_submissions submission
       ON submission.employee_id = subject.employee_id
      AND submission.cycle_id = $2
     WHERE subject.employee_id = $1
       AND subject.status = 'active'`,
    [subjectEmployeeId, cycleId],
  )
  if (!rows[0]) throw new HttpError(404, 'Goal subject not found')
  const row = rows[0]
  const coveredManagerIds = await listActiveDelegatedManagerIds(actorEmployeeId)
  const covered = new Set(coveredManagerIds)
  const reportsToId =
    row.reports_to_employee_id == null
      ? null
      : Number(row.reports_to_employee_id)
  const skipLevelId =
    row.skip_level_employee_id == null
      ? null
      : Number(row.skip_level_employee_id)
  return {
    actorEmployeeId,
    permissions,
    isSelf: actorEmployeeId === Number(row.employee_id),
    isDirectManager:
      actorEmployeeId === reportsToId ||
      (reportsToId != null && covered.has(reportsToId)),
    isSkipLevelManager:
      actorEmployeeId === skipLevelId ||
      (skipLevelId != null && covered.has(skipLevelId)),
    approvalStage: row.post_window_approval_stage ?? null,
  }
}

/**
 * Authorize one goal operation from the current org graph and submission stage.
 * The route never trusts actor/manager identity supplied by the client.
 */
export async function assertGoalAccess(
  user,
  { action, cycleId, subjectEmployeeId },
) {
  const context = await loadGoalAccessContext(
    user,
    cycleId,
    subjectEmployeeId,
  )
  const canReadAll = context.permissions.has('platform.read_all')
  const canWriteAll = context.permissions.has('platform.write_all')

  let allowed = false
  switch (action) {
    case 'read':
      allowed =
        context.isSelf ||
        context.isDirectManager ||
        context.isSkipLevelManager ||
        canReadAll
      break
    case 'edit':
      allowed = context.isSelf || context.isDirectManager || canWriteAll
      break
    case 'submit':
      allowed = context.isSelf || canWriteAll
      break
    case 'approve':
      allowed =
        canWriteAll ||
        (context.approvalStage === 'manager_manager'
          ? context.isSkipLevelManager
          : context.isDirectManager)
      break
    case 'send_back':
      allowed =
        canWriteAll ||
        context.isDirectManager ||
        (context.approvalStage === 'manager_manager' &&
          context.isSkipLevelManager)
      break
    case 'rate':
      allowed = canWriteAll || context.isDirectManager
      break
    default:
      throw new HttpError(500, `Unknown goal access action: ${action}`)
  }

  if (!allowed) throw new HttpError(403, 'Insufficient goal access')
  return context
}

/** Employees whose submissions the viewer may see for a cycle list. */
export async function listVisibleGoalSubjectIds(user) {
  const actorEmployeeId = employeeIdFor(user)
  const permissions = new Set(await permissionsForPlatformUser(user))
  if (permissions.has('platform.read_all')) return null

  const coveredManagerIds = await listActiveDelegatedManagerIds(actorEmployeeId)
  const managerIds = [actorEmployeeId, ...coveredManagerIds]
  const { rows } = await getPool().query(
    `SELECT employee_id
     FROM platform.employees
     WHERE status = 'active'
       AND (
         employee_id = ANY($1::int[])
         OR reports_to_employee_id = ANY($1::int[])
         OR reports_to_employee_id IN (
           SELECT employee_id
           FROM platform.employees
           WHERE reports_to_employee_id = ANY($1::int[])
         )
       )`,
    [managerIds],
  )
  return rows.map((row) => Number(row.employee_id))
}
