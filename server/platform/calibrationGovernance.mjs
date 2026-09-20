import { getPool } from '../db.mjs'
import { HttpError } from '../errors.mjs'
import { permissionsForPlatformUser } from './auth.mjs'
import { createPlatformNotification } from './notifications.mjs'

function actorId(platformUser) {
  const id = Number(platformUser?.employeeId)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function assertCalibrationUnlocked(db, cycleId) {
  const { rows } = await db.query(
    `SELECT locked_at
     FROM platform.calibration_sittings
     WHERE cycle_id = $1`,
    [cycleId],
  )
  if (rows[0]?.locked_at) {
    throw new HttpError(
      409,
      'This calibration session is locked. Ratings cannot change.',
    )
  }
}

export async function assertCalibrationOverrideAllowed(
  db,
  platformUser,
  subjectEmployeeId,
) {
  const viewerId = actorId(platformUser)
  if (!viewerId) {
    throw new HttpError(403, 'Sign in as an employee to change a grade.')
  }
  if (viewerId === Number(subjectEmployeeId)) {
    throw new HttpError(403, 'You cannot calibrate your own packet.')
  }
  const permissions = await permissionsForPlatformUser(platformUser)
  if (permissions.includes('platform.write_all')) return
  const { rows } = await db.query(
    `SELECT e.department_id,
            e.team_id,
            d.head_employee_id,
            d.hrbp_employee_id
     FROM platform.employees e
     LEFT JOIN platform.departments d ON d.id = e.department_id
     WHERE e.employee_id = $1`,
    [subjectEmployeeId],
  )
  const row = rows[0]
  if (!row) throw new HttpError(404, 'Employee not found')
  if (
    Number(row.head_employee_id) === viewerId ||
    Number(row.hrbp_employee_id) === viewerId
  ) {
    return
  }
  if (row.department_id != null) {
    const assigned = await db.query(
      `SELECT 1
       FROM platform.department_calibrators
       WHERE department_id = $1 AND employee_id = $2`,
      [row.department_id, viewerId],
    )
    if (assigned.rows[0]) return
  }
  if (row.team_id != null) {
    const assigned = await db.query(
      `SELECT 1
       FROM platform.team_calibrators
       WHERE team_id = $1 AND employee_id = $2`,
      [row.team_id, viewerId],
    )
    if (assigned.rows[0]) return
  }
  const personal = await db.query(
    `SELECT 1
     FROM platform.employee_calibrators
     WHERE subject_employee_id = $1 AND employee_id = $2`,
    [subjectEmployeeId, viewerId],
  )
  if (personal.rows[0]) return
  throw new HttpError(
    403,
    'Only an admin with write access, the head of department, the HRBP, or a calibrator assigned to this department, team, or person can change this grade.',
  )
}

export async function notifyManagerOfCalibrationOverride(client, input) {
  const { rows } = await client.query(
    `SELECT name, reports_to_employee_id
     FROM platform.employees
     WHERE employee_id = $1`,
    [input.subjectEmployeeId],
  )
  const managerId = Number(rows[0]?.reports_to_employee_id)
  if (!Number.isInteger(managerId) || managerId <= 0) return
  const name = rows[0]?.name?.trim() || 'An employee'
  await createPlatformNotification(client, {
    eventKey: 'review_packet.calibrated',
    recipientEmployeeId: managerId,
    actorEmployeeId: input.actorEmployeeId ?? null,
    title: 'Calibration grade changed',
    body: `${name}'s grade is now ${input.toGrade}. ${input.reason}`,
    icon: 'scale',
    kind: 'info',
    destination: '/calibration/ratings',
    dedupeKey: `calibrate:${input.packetId}:${input.eventId}`,
    cycleId: input.cycleId,
    personId: input.subjectEmployeeId,
    metadata: { packetId: input.packetId, toGrade: input.toGrade },
  })
}

function mapDepartment(row) {
  const ids = Array.isArray(row.calibrator_ids) ? row.calibrator_ids : []
  return {
    departmentId: Number(row.department_id),
    department: row.name,
    headEmployeeId:
      row.head_employee_id == null ? null : Number(row.head_employee_id),
    hrbpEmployeeId:
      row.hrbp_employee_id == null ? null : Number(row.hrbp_employee_id),
    employeeIds: ids.map(Number).filter((id) => Number.isInteger(id) && id > 0),
  }
}

export async function listDepartmentCalibrators() {
  const { rows } = await getPool().query(
    `SELECT d.id AS department_id,
            d.name,
            d.head_employee_id,
            d.hrbp_employee_id,
            COALESCE(
              array_agg(c.employee_id) FILTER (WHERE c.employee_id IS NOT NULL),
              '{}'
            ) AS calibrator_ids
     FROM platform.departments d
     LEFT JOIN platform.department_calibrators c ON c.department_id = d.id
     GROUP BY d.id
     ORDER BY d.name`,
  )
  return rows.map(mapDepartment)
}

export async function setDepartmentCalibrators(departmentId, employeeIds) {
  const ids = [
    ...new Set(
      (employeeIds ?? [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ]
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const department = await client.query(
      `SELECT id FROM platform.departments WHERE id = $1`,
      [departmentId],
    )
    if (!department.rows[0]) throw new HttpError(404, 'Department not found')
    if (ids.length > 0) {
      const people = await client.query(
        `SELECT employee_id FROM platform.employees WHERE employee_id = ANY($1::int[])`,
        [ids],
      )
      if (people.rows.length !== ids.length) {
        throw new HttpError(400, 'One or more calibrators are not employees.')
      }
    }
    await client.query(
      `DELETE FROM platform.department_calibrators WHERE department_id = $1`,
      [departmentId],
    )
    for (const employeeId of ids) {
      await client.query(
        `INSERT INTO platform.department_calibrators (department_id, employee_id)
         VALUES ($1, $2)`,
        [departmentId, employeeId],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  const all = await listDepartmentCalibrators()
  return all.find((row) => row.departmentId === Number(departmentId)) ?? null
}

function normalizeEmployeeIds(employeeIds) {
  return [
    ...new Set(
      (employeeIds ?? [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ]
}

async function assertEmployeesExist(client, ids) {
  if (ids.length === 0) return
  const people = await client.query(
    `SELECT employee_id FROM platform.employees WHERE employee_id = ANY($1::int[])`,
    [ids],
  )
  if (people.rows.length !== ids.length) {
    throw new HttpError(400, 'One or more calibrators are not employees.')
  }
}

function mapIds(value) {
  const ids = Array.isArray(value) ? value : []
  return ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
}

export async function listTeamCalibrators() {
  const { rows } = await getPool().query(
    `SELECT t.id AS team_id,
            t.name,
            d.name AS department_name,
            COALESCE(
              array_agg(c.employee_id) FILTER (WHERE c.employee_id IS NOT NULL),
              '{}'
            ) AS calibrator_ids
     FROM platform.teams t
     JOIN platform.departments d ON d.id = t.department_id
     LEFT JOIN platform.team_calibrators c ON c.team_id = t.id
     GROUP BY t.id, d.name
     ORDER BY d.name, t.name`,
  )
  return rows.map((row) => ({
    teamId: Number(row.team_id),
    team: row.name,
    department: row.department_name,
    employeeIds: mapIds(row.calibrator_ids),
  }))
}

export async function setTeamCalibrators(teamId, employeeIds) {
  const ids = normalizeEmployeeIds(employeeIds)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const team = await client.query(
      `SELECT id FROM platform.teams WHERE id = $1`,
      [teamId],
    )
    if (!team.rows[0]) throw new HttpError(404, 'Team not found')
    await assertEmployeesExist(client, ids)
    await client.query(
      `DELETE FROM platform.team_calibrators WHERE team_id = $1`,
      [teamId],
    )
    for (const employeeId of ids) {
      await client.query(
        `INSERT INTO platform.team_calibrators (team_id, employee_id)
         VALUES ($1, $2)`,
        [teamId, employeeId],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  const all = await listTeamCalibrators()
  return all.find((row) => row.teamId === Number(teamId)) ?? null
}

export async function listPersonCalibrators() {
  const { rows } = await getPool().query(
    `SELECT subject_employee_id,
            COALESCE(array_agg(employee_id), '{}') AS calibrator_ids
     FROM platform.employee_calibrators
     GROUP BY subject_employee_id
     ORDER BY subject_employee_id`,
  )
  return rows.map((row) => ({
    subjectEmployeeId: Number(row.subject_employee_id),
    employeeIds: mapIds(row.calibrator_ids),
  }))
}

export async function setPersonCalibrators(subjectEmployeeId, employeeIds) {
  const ids = normalizeEmployeeIds(employeeIds).filter(
    (id) => id !== Number(subjectEmployeeId),
  )
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const subject = await client.query(
      `SELECT employee_id FROM platform.employees WHERE employee_id = $1`,
      [subjectEmployeeId],
    )
    if (!subject.rows[0]) throw new HttpError(404, 'Employee not found')
    await assertEmployeesExist(client, ids)
    await client.query(
      `DELETE FROM platform.employee_calibrators WHERE subject_employee_id = $1`,
      [subjectEmployeeId],
    )
    for (const employeeId of ids) {
      await client.query(
        `INSERT INTO platform.employee_calibrators (subject_employee_id, employee_id)
         VALUES ($1, $2)`,
        [subjectEmployeeId, employeeId],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  if (ids.length === 0) return null
  return { subjectEmployeeId: Number(subjectEmployeeId), employeeIds: ids }
}

export async function listCalibratorAssignments() {
  const [departments, teams, people] = await Promise.all([
    listDepartmentCalibrators(),
    listTeamCalibrators(),
    listPersonCalibrators(),
  ])
  return { departments, teams, people }
}
