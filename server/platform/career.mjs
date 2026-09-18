import { getPool } from '../db.mjs'

const CHANGE_KINDS = new Set(['hire', 'promotion', 'lateral', 'demotion'])
const END_STATUSES = new Set(['completed', 'cancelled'])

function calendarDay(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      const err = new Error('Date must be YYYY-MM-DD.')
      err.statusCode = 400
      throw err
    }
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${value.getFullYear()}-${month}-${day}`
  }
  const raw = String(value ?? '').trim()
  const day = raw.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const err = new Error('Date must be YYYY-MM-DD.')
    err.statusCode = 400
    throw err
  }
  return day
}

function utcDay(value) {
  if (value == null || value === '') return new Date().toISOString().slice(0, 10)
  return calendarDay(value)
}

/**
 * First grade is a hire. Later edits default to promotion unless the caller
 * names lateral or demotion. There is no grade ladder to infer direction.
 */
export function classifyGradeChange(previousGrade, requestedKind) {
  const previous = String(previousGrade ?? '').trim()
  if (!previous) return 'hire'
  const requested = String(requestedKind ?? '').trim()
  return CHANGE_KINDS.has(requested) ? requested : 'promotion'
}

export async function recordGradeChange(client, input) {
  const jobGrade = String(input.jobGrade ?? '').trim()
  if (!jobGrade) return
  const employeeId = Number(input.employeeId)
  const effectiveOn = utcDay(input.effectiveOn)
  const changeKind = classifyGradeChange(
    input.previousGrade,
    input.changeKind,
  )
  await client.query(
    `INSERT INTO platform.employee_grade_changes
       (employee_id, job_grade, effective_on, change_kind)
     SELECT $1, $2, $3::date, $4
     WHERE NOT EXISTS (
       SELECT 1 FROM platform.employee_grade_changes
       WHERE employee_id = $1
         AND job_grade = $2
         AND effective_on = $3::date
         AND change_kind = $4
     )`,
    [employeeId, jobGrade, effectiveOn, changeKind],
  )
}

export async function startEmployeePip(employeeId, startedOn) {
  const id = Number(employeeId)
  const day = utcDay(startedOn)
  const pool = getPool()
  const open = await pool.query(
    `SELECT id FROM platform.employee_pips
     WHERE employee_id = $1 AND status = 'active'
     LIMIT 1`,
    [id],
  )
  if (open.rows[0]) {
    const err = new Error('This employee already has an active PIP.')
    err.statusCode = 409
    throw err
  }
  const { rows } = await pool.query(
    `INSERT INTO platform.employee_pips (employee_id, started_on, status)
     VALUES ($1, $2::date, 'active')
     RETURNING id, employee_id, started_on, ended_on, status`,
    [id, day],
  )
  return mapPip(rows[0])
}

export async function endEmployeePip(employeeId, input = {}) {
  const id = Number(employeeId)
  const status = String(input.status ?? 'completed')
  if (!END_STATUSES.has(status)) {
    const err = new Error('PIP can only be completed or cancelled.')
    err.statusCode = 400
    throw err
  }
  const day = utcDay(input.endedOn)
  const { rows } = await getPool().query(
    `UPDATE platform.employee_pips
     SET ended_on = $3::date, status = $2
     WHERE employee_id = $1 AND status = 'active'
     RETURNING id, employee_id, started_on, ended_on, status`,
    [id, status, day],
  )
  if (!rows[0]) {
    const err = new Error('No active PIP to close.')
    err.statusCode = 404
    throw err
  }
  return mapPip(rows[0])
}

function mapPip(row) {
  return {
    id: Number(row.id),
    employeeId: row.employee_id,
    startedOn: utcDay(row.started_on),
    endedOn: row.ended_on ? utcDay(row.ended_on) : null,
    status: row.status,
  }
}
