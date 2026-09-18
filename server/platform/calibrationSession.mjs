import { getPool } from '../db.mjs'

const STATUSES = new Set(['not_reviewed', 'discussed', 'confirmed'])
const NOTES_LIMIT = 4000

function iso(value) {
  if (!value) return null
  const instant = value instanceof Date ? value : new Date(value)
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString()
}

function mapEmployee(row) {
  return {
    employeeId: row.employee_id,
    status: row.status,
    notes: row.notes ?? '',
    adjustedAt: iso(row.adjusted_at),
  }
}

export async function getCalibrationSitting(cycleId) {
  const pool = getPool()
  const [cycle, people] = await Promise.all([
    pool.query(
      `SELECT clean_confirmed_at
       FROM platform.calibration_sittings
       WHERE cycle_id = $1`,
      [cycleId],
    ),
    pool.query(
      `SELECT employee_id, status, notes, adjusted_at
       FROM platform.calibration_sitting_employees
       WHERE cycle_id = $1
       ORDER BY employee_id`,
      [cycleId],
    ),
  ])
  return {
    cycleId,
    cleanConfirmedAt: iso(cycle.rows[0]?.clean_confirmed_at),
    employees: people.rows.map(mapEmployee),
  }
}

export async function saveCalibrationSittingEmployee(
  cycleId,
  employeeId,
  input,
  actorEmployeeId,
) {
  const hasStatus = Object.prototype.hasOwnProperty.call(input, 'status')
  const hasNotes = Object.prototype.hasOwnProperty.call(input, 'notes')
  const markAdjusted = input.adjusted === true
  if (!hasStatus && !hasNotes && !markAdjusted) {
    const err = new Error('Nothing to save.')
    err.statusCode = 400
    throw err
  }
  const status = hasStatus ? String(input.status ?? '') : null
  if (status != null && !STATUSES.has(status)) {
    const err = new Error('Unknown calibration status.')
    err.statusCode = 400
    throw err
  }
  let notes = null
  if (hasNotes) {
    notes = String(input.notes ?? '')
    if (notes.length > NOTES_LIMIT) {
      const err = new Error(`Notes must be ${NOTES_LIMIT} characters or fewer.`)
      err.statusCode = 400
      throw err
    }
  }
  const pool = getPool()
  const employee = await pool.query(
    `SELECT 1 FROM platform.employees WHERE employee_id = $1`,
    [employeeId],
  )
  if (!employee.rows[0]) {
    const err = new Error('Employee not found.')
    err.statusCode = 404
    throw err
  }
  await pool.query(
    `INSERT INTO platform.calibration_sitting_employees (
       cycle_id, employee_id, status, notes, adjusted_at, updated_by_employee_id
     ) VALUES (
       $1, $2, COALESCE($3, 'not_reviewed'), COALESCE($4, ''),
       CASE WHEN $5::boolean THEN now() ELSE NULL END,
       $6
     )
     ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
       status = COALESCE($3, platform.calibration_sitting_employees.status),
       notes = COALESCE($4, platform.calibration_sitting_employees.notes),
       adjusted_at = CASE
         WHEN $5::boolean THEN now()
         ELSE platform.calibration_sitting_employees.adjusted_at
       END,
       updated_by_employee_id = $6,
       updated_at = now()`,
    [cycleId, employeeId, status, notes, markAdjusted, actorEmployeeId],
  )
  return getCalibrationSitting(cycleId)
}

export async function confirmCalibrationClean(cycleId, actorEmployeeId) {
  await getPool().query(
    `INSERT INTO platform.calibration_sittings (
       cycle_id, clean_confirmed_at, clean_confirmed_by_employee_id
     ) VALUES ($1, now(), $2)
     ON CONFLICT (cycle_id) DO UPDATE SET
       clean_confirmed_at = now(),
       clean_confirmed_by_employee_id = EXCLUDED.clean_confirmed_by_employee_id,
       updated_at = now()`,
    [cycleId, actorEmployeeId],
  )
  return getCalibrationSitting(cycleId)
}
