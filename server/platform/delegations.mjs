/**
 * Manual manager-absence delegations. Does not change reports_to.
 */
import { getPool } from '../db.mjs'
import { HttpError } from '../errors.mjs'
import { appendActivityEvent } from './activity.mjs'
import { permissionsForPlatformUser } from './auth.mjs'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function employeeIdFor(user) {
  const employeeId = Number(user?.employeeId)
  if (!Number.isInteger(employeeId)) {
    throw new HttpError(403, 'A signed-in employee is required')
  }
  return employeeId
}

function parseEmployeeId(value, label) {
  const employeeId = Number(value)
  if (!Number.isInteger(employeeId)) {
    throw new HttpError(400, `Invalid ${label}`)
  }
  return employeeId
}

function parseDay(value, label) {
  const day = String(value ?? '').trim()
  if (!DATE_RE.test(day)) {
    throw new HttpError(400, `${label} must be a YYYY-MM-DD date`)
  }
  return day
}

function startOfDay(day) {
  return `${day}T00:00:00.000Z`
}

function endOfDay(day) {
  return `${day}T23:59:59.999Z`
}

function delegationStatus(row, now = new Date()) {
  if (row.revoked_at) return 'revoked'
  const starts = new Date(row.starts_at)
  const ends = new Date(row.ends_at)
  if (now < starts) return 'scheduled'
  if (now > ends) return 'ended'
  return 'active'
}

function mapDelegation(row, now = new Date()) {
  return {
    id: String(row.id),
    absentEmployeeId: Number(row.absent_employee_id),
    absentName: row.absent_name ?? '',
    delegateEmployeeId: Number(row.delegate_employee_id),
    delegateName: row.delegate_name ?? '',
    delegateAvatarUrl: row.delegate_avatar_url || undefined,
    absentAvatarUrl: row.absent_avatar_url || undefined,
    startsOn: String(row.starts_at).slice(0, 10),
    endsOn: String(row.ends_at).slice(0, 10),
    assignedByEmployeeId: Number(row.assigned_by_employee_id),
    assignedByName: row.assigned_by_name ?? '',
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : undefined,
    status: delegationStatus(row, now),
  }
}

const DELEGATION_FROM = `
  FROM platform.manager_delegations delegation
  JOIN platform.employees absent_emp
    ON absent_emp.employee_id = delegation.absent_employee_id
  JOIN platform.employees delegate_emp
    ON delegate_emp.employee_id = delegation.delegate_employee_id
  JOIN platform.employees assigned_emp
    ON assigned_emp.employee_id = delegation.assigned_by_employee_id
`

const DELEGATION_SELECT = `
  SELECT
    delegation.*,
    absent_emp.full_name AS absent_name,
    absent_emp.avatar_url AS absent_avatar_url,
    delegate_emp.full_name AS delegate_name,
    delegate_emp.avatar_url AS delegate_avatar_url,
    assigned_emp.full_name AS assigned_by_name
  ${DELEGATION_FROM}
`

export async function listActiveDelegatedManagerIds(delegateEmployeeId) {
  const { rows } = await getPool().query(
    `SELECT absent_employee_id
     FROM platform.manager_delegations
     WHERE delegate_employee_id = $1
       AND revoked_at IS NULL
       AND starts_at <= now()
       AND ends_at >= now()`,
    [delegateEmployeeId],
  )
  return rows.map((row) => Number(row.absent_employee_id))
}

export async function listManagerDelegations({ employeeId, delegateEmployeeId }) {
  const clauses = []
  const params = []
  if (Number.isInteger(employeeId)) {
    params.push(employeeId)
    clauses.push(
      `(delegation.absent_employee_id = $${params.length} OR delegation.delegate_employee_id = $${params.length})`,
    )
  }
  if (Number.isInteger(delegateEmployeeId)) {
    params.push(delegateEmployeeId)
    clauses.push(`delegation.delegate_employee_id = $${params.length}`)
    clauses.push(`delegation.revoked_at IS NULL`)
    clauses.push(`delegation.starts_at <= now()`)
    clauses.push(`delegation.ends_at >= now()`)
  }
  if (clauses.length === 0) {
    throw new HttpError(400, 'employeeId or delegateEmployeeId is required')
  }
  const { rows } = await getPool().query(
    `${DELEGATION_SELECT}
     WHERE ${clauses.join(' AND ')}
     ORDER BY delegation.starts_at DESC, delegation.id DESC`,
    params,
  )
  return rows.map((row) => mapDelegation(row))
}

export async function canViewManagerDelegations(user, employeeId) {
  const actorId = employeeIdFor(user)
  if (actorId === employeeId) return true
  const permissions = new Set(await permissionsForPlatformUser(user))
  if (
    permissions.has('platform.write_all') ||
    permissions.has('platform.read_all')
  ) {
    return true
  }
  const { rows } = await getPool().query(
    `SELECT 1
     FROM platform.manager_delegations
     WHERE (absent_employee_id = $1 OR delegate_employee_id = $1)
       AND (absent_employee_id = $2 OR delegate_employee_id = $2)
     LIMIT 1`,
    [actorId, employeeId],
  )
  return Boolean(rows[0])
}

export async function assignManagerDelegation(
  { absentEmployeeId, delegateEmployeeId, startsOn, endsOn },
  platformUser,
) {
  const actorId = employeeIdFor(platformUser)
  const permissions = new Set(await permissionsForPlatformUser(platformUser))
  if (!permissions.has('platform.write_all')) {
    throw new HttpError(403, 'Only full read-write admins can assign a delegation')
  }

  const absentId = parseEmployeeId(absentEmployeeId, 'absent manager')
  const delegateId = parseEmployeeId(delegateEmployeeId, 'delegate')
  if (absentId === delegateId) {
    throw new HttpError(400, 'A manager cannot delegate to themselves')
  }
  const startDay = parseDay(startsOn, 'Start date')
  const endDay = parseDay(endsOn, 'End date')
  if (endDay < startDay) {
    throw new HttpError(400, 'End date must be on or after the start date')
  }

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const people = await client.query(
      `SELECT employee_id, full_name, status
       FROM platform.employees
       WHERE employee_id = ANY($1::int[])`,
      [[absentId, delegateId]],
    )
    const byId = new Map(
      people.rows.map((row) => [Number(row.employee_id), row]),
    )
    const absent = byId.get(absentId)
    const delegate = byId.get(delegateId)
    if (!absent || absent.status !== 'active') {
      throw new HttpError(404, 'Absent manager was not found')
    }
    if (!delegate || delegate.status !== 'active') {
      throw new HttpError(400, 'Delegate must be an active employee')
    }

    const overlap = await client.query(
      `SELECT id
       FROM platform.manager_delegations
       WHERE absent_employee_id = $1
         AND revoked_at IS NULL
         AND starts_at <= $3::timestamptz
         AND ends_at >= $2::timestamptz
       LIMIT 1`,
      [absentId, startOfDay(startDay), endOfDay(endDay)],
    )
    if (overlap.rows[0]) {
      throw new HttpError(
        409,
        'This manager already has a delegation for those dates. Revoke it first.',
      )
    }

    const inserted = await client.query(
      `INSERT INTO platform.manager_delegations (
         absent_employee_id,
         delegate_employee_id,
         starts_at,
         ends_at,
         assigned_by_employee_id
       )
       VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5)
       RETURNING id`,
      [absentId, delegateId, startOfDay(startDay), endOfDay(endDay), actorId],
    )
    const delegationId = String(inserted.rows[0].id)
    await appendActivityEvent(client, {
      eventKey: 'manager_delegation.assigned',
      entityType: 'manager_delegation',
      entityId: delegationId,
      actorEmployeeId: actorId,
      actorEmail: platformUser.email ?? '',
      actorName: platformUser.name ?? '',
      subjectEmployeeId: absentId,
      summary: `Delegated ${absent.full_name}'s responsibility to ${delegate.full_name}`,
      changes: [
        { field: 'delegateEmployeeId', to: delegateId },
        { field: 'startsOn', to: startDay },
        { field: 'endsOn', to: endDay },
      ],
      metadata: {
        delegateEmployeeId: delegateId,
        delegateName: delegate.full_name,
        absentEmployeeId: absentId,
        absentName: absent.full_name,
        startsOn: startDay,
        endsOn: endDay,
      },
      source: 'api',
    })
    await client.query('COMMIT')
    const listed = await listManagerDelegations({ employeeId: absentId })
    return listed.find((item) => item.id === delegationId) ?? listed[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function revokeManagerDelegation(delegationId, platformUser) {
  const actorId = employeeIdFor(platformUser)
  const permissions = new Set(await permissionsForPlatformUser(platformUser))
  if (!permissions.has('platform.write_all')) {
    throw new HttpError(403, 'Only full read-write admins can revoke a delegation')
  }
  const id = Number(delegationId)
  if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid delegation id')

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT *
       FROM platform.manager_delegations
       WHERE id = $1
       FOR UPDATE`,
      [id],
    )
    if (!rows[0]) throw new HttpError(404, 'Delegation was not found')
    if (rows[0].revoked_at) {
      throw new HttpError(409, 'This delegation is already revoked')
    }
    const names = await client.query(
      `SELECT
         absent_emp.full_name AS absent_name,
         delegate_emp.full_name AS delegate_name
       FROM platform.employees absent_emp
       JOIN platform.employees delegate_emp ON delegate_emp.employee_id = $2
       WHERE absent_emp.employee_id = $1`,
      [rows[0].absent_employee_id, rows[0].delegate_employee_id],
    )
    rows[0].absent_name = names.rows[0]?.absent_name ?? ''
    rows[0].delegate_name = names.rows[0]?.delegate_name ?? ''
    await client.query(
      `UPDATE platform.manager_delegations
       SET revoked_at = now(),
           revoked_by_employee_id = $2
       WHERE id = $1`,
      [id, actorId],
    )
    await appendActivityEvent(client, {
      eventKey: 'manager_delegation.revoked',
      entityType: 'manager_delegation',
      entityId: String(id),
      actorEmployeeId: actorId,
      actorEmail: platformUser.email ?? '',
      actorName: platformUser.name ?? '',
      subjectEmployeeId: Number(rows[0].absent_employee_id),
      summary: `Revoked delegation: ${rows[0].delegate_name} for ${rows[0].absent_name}`,
      metadata: {
        delegateEmployeeId: Number(rows[0].delegate_employee_id),
        delegateName: rows[0].delegate_name,
        absentEmployeeId: Number(rows[0].absent_employee_id),
        absentName: rows[0].absent_name,
      },
      source: 'api',
    })
    await client.query('COMMIT')
    const listed = await listManagerDelegations({
      employeeId: Number(rows[0].absent_employee_id),
    })
    return listed.find((item) => item.id === String(id)) ?? mapDelegation(rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
