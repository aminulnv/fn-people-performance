/**
 * Role catalog + competency matrix.
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'

const EXPECTED_LEVELS = new Set([
  'none',
  'basic',
  'intermediate',
  'advanced',
  'expert',
])

function actorFromUser(platformUser) {
  return {
    actorEmployeeId: platformUser?.employeeId ?? null,
    actorEmail: platformUser?.email ?? '',
    actorName: platformUser?.name ?? '',
  }
}

function isoTimestamp(value) {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function integerId(value) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseLevel(value) {
  const level = String(value ?? 'none').trim()
  return EXPECTED_LEVELS.has(level) ? level : 'none'
}

function parseGoals(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    try {
      return parseGoals(JSON.parse(value))
    } catch {
      return value.trim() ? [value.trim()] : []
    }
  }
  return []
}

function mapRole(row, skills = []) {
  return {
    id: row.id,
    name: row.name,
    departmentId: integerId(row.department_id),
    departmentName: row.department_name ?? '',
    description: row.description ?? '',
    goals: parseGoals(row.goals),
    locations: row.locations ?? 'All',
    archivedAt: row.archived_at ? isoTimestamp(row.archived_at) : null,
    headcount: Number(row.headcount) || 0,
    skills,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  }
}

const ROLE_SELECT = `
  SELECT
    r.id,
    r.name,
    r.department_id,
    r.description,
    r.goals,
    r.locations,
    r.archived_at,
    r.created_at,
    r.updated_at,
    d.name AS department_name,
    (
      SELECT count(*)::int
      FROM platform.employees e
      WHERE e.role_id = r.id AND e.status = 'active'
    ) AS headcount
  FROM platform.roles r
  LEFT JOIN platform.departments d ON d.id = r.department_id
`

async function loadMatrix(client, roleIds) {
  if (roleIds.length === 0) return new Map()
  const { rows: skillRows } = await client.query(
    `SELECT rs.role_id, rs.skill_id, rs.weight_pct, s.name AS skill_name
     FROM platform.role_skills rs
     JOIN platform.skills s ON s.id = rs.skill_id AND s.deleted_at IS NULL
     WHERE rs.role_id = ANY($1::text[])
     ORDER BY lower(s.name)`,
    [roleIds],
  )
  const { rows: expectationRows } = await client.query(
    `SELECT role_id, skill_id, job_grade, expected_level, description
     FROM platform.role_skill_expectations
     WHERE role_id = ANY($1::text[])`,
    [roleIds],
  )
  const expectationsByKey = new Map()
  const descriptionsByKey = new Map()
  for (const row of expectationRows) {
    const key = `${row.role_id}::${row.skill_id}`
    const expectations = expectationsByKey.get(key) ?? {}
    const descriptions = descriptionsByKey.get(key) ?? {}
    expectations[String(row.job_grade)] = parseLevel(row.expected_level)
    const description = String(row.description ?? '').trim()
    if (description) descriptions[String(row.job_grade)] = description
    expectationsByKey.set(key, expectations)
    descriptionsByKey.set(key, descriptions)
  }
  const byRole = new Map()
  for (const row of skillRows) {
    const key = `${row.role_id}::${row.skill_id}`
    const list = byRole.get(row.role_id) ?? []
    list.push({
      skillId: row.skill_id,
      skillName: row.skill_name,
      weightPct: Number(row.weight_pct) || 0,
      expectations: expectationsByKey.get(key) ?? {},
      descriptions: descriptionsByKey.get(key) ?? {},
    })
    byRole.set(row.role_id, list)
  }
  return byRole
}

export async function listRoles({ includeArchived = false } = {}) {
  const pool = getPool()
  const { rows } = await pool.query(
    `${ROLE_SELECT}
     ${includeArchived ? '' : 'WHERE r.archived_at IS NULL'}
     ORDER BY lower(r.name)`,
  )
  const matrix = await loadMatrix(pool, rows.map((row) => row.id))
  return rows.map((row) => mapRole(row, matrix.get(row.id) ?? []))
}

export async function getRole(roleId) {
  const id = String(roleId ?? '').trim()
  if (!id) return null
  const pool = getPool()
  const { rows } = await pool.query(`${ROLE_SELECT} WHERE r.id = $1`, [id])
  if (!rows[0]) return null
  const matrix = await loadMatrix(pool, [id])
  return mapRole(rows[0], matrix.get(id) ?? [])
}

export async function upsertRoleByName(client, name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return null
  const { rows: existing } = await client.query(
    `SELECT id, name FROM platform.roles WHERE lower(name) = lower($1) LIMIT 1`,
    [trimmed],
  )
  if (existing[0]) return existing[0]
  const id = `role-${crypto.randomUUID()}`
  const { rows } = await client.query(
    `INSERT INTO platform.roles (id, name)
     SELECT $1, $2
     WHERE NOT EXISTS (
       SELECT 1 FROM platform.roles WHERE lower(name) = lower($2)
     )
     RETURNING id, name`,
    [id, trimmed],
  )
  if (rows[0]) return rows[0]
  const { rows: again } = await client.query(
    `SELECT id, name FROM platform.roles WHERE lower(name) = lower($1) LIMIT 1`,
    [trimmed],
  )
  return again[0] ?? null
}

export async function resolveEmployeeRole(client, input) {
  if (Object.prototype.hasOwnProperty.call(input, 'roleId')) {
    const raw = input.roleId
    if (raw == null || String(raw).trim() === '') {
      return {
        roleId: null,
        roleName: String(input.role ?? '').trim(),
      }
    }
    const roleId = String(raw).trim()
    const { rows } = await client.query(
      `SELECT id, name FROM platform.roles WHERE id = $1`,
      [roleId],
    )
    if (!rows[0]) throw new HttpError(400, 'Unknown role.')
    return { roleId: rows[0].id, roleName: rows[0].name }
  }
  const roleName = String(input.role ?? '').trim()
  if (!roleName) return { roleId: null, roleName: '' }
  const { rows } = await client.query(
    `SELECT id, name FROM platform.roles WHERE lower(name) = lower($1) LIMIT 1`,
    [roleName],
  )
  if (rows[0]) return { roleId: rows[0].id, roleName: rows[0].name }
  return { roleId: null, roleName }
}

async function assertDepartment(client, departmentId) {
  if (departmentId == null) return null
  const { rows } = await client.query(
    `SELECT id FROM platform.departments WHERE id = $1`,
    [departmentId],
  )
  if (!rows[0]) throw new HttpError(400, 'Unknown department.')
  return departmentId
}

export async function createRole(input, platformUser) {
  const name = String(input.name ?? '').trim()
  if (!name) throw new HttpError(400, 'Give the role a name.')
  const actor = actorFromUser(platformUser)
  const departmentId = integerId(input.departmentId)
  const description = String(input.description ?? '').trim()
  const goals = parseGoals(input.goals)
  const locations = String(input.locations ?? 'All').trim() || 'All'
  const id = String(input.id ?? '').trim() || `role-${crypto.randomUUID()}`

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await assertDepartment(client, departmentId)
    const clash = await client.query(
      `SELECT id FROM platform.roles WHERE lower(name) = lower($1) LIMIT 1`,
      [name],
    )
    if (clash.rows[0]) {
      throw new HttpError(409, 'A role with this name already exists.')
    }
    await client.query(
      `INSERT INTO platform.roles (
         id, name, department_id, description, goals, locations
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        id,
        name,
        departmentId,
        description,
        JSON.stringify(goals),
        locations,
      ],
    )
    await appendActivityEvent(client, {
      eventKey: 'role.created',
      entityType: 'role',
      entityId: id,
      ...actor,
      summary: `Created role ${name}`,
      metadata: { roleId: id },
      source: 'api',
    })
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
  return getRole(id)
}

export async function updateRole(roleId, input, platformUser) {
  const id = String(roleId ?? '').trim()
  if (!id) throw new HttpError(400, 'Role id is required.')
  const actor = actorFromUser(platformUser)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT * FROM platform.roles WHERE id = $1 FOR UPDATE`,
      [id],
    )
    if (!rows[0]) throw new HttpError(404, 'Role not found.')
    const previous = rows[0]
    const name =
      input.name != null ? String(input.name).trim() : previous.name
    if (!name) throw new HttpError(400, 'Give the role a name.')
    if (input.name != null) {
      const clash = await client.query(
        `SELECT id FROM platform.roles
         WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1`,
        [name, id],
      )
      if (clash.rows[0]) {
        throw new HttpError(409, 'A role with this name already exists.')
      }
    }
    const departmentId = Object.prototype.hasOwnProperty.call(
      input,
      'departmentId',
    )
      ? await assertDepartment(client, integerId(input.departmentId))
      : previous.department_id
    const description = Object.prototype.hasOwnProperty.call(input, 'description')
      ? String(input.description ?? '').trim()
      : previous.description ?? ''
    const goals = Object.prototype.hasOwnProperty.call(input, 'goals')
      ? parseGoals(input.goals)
      : parseGoals(previous.goals)
    const locations = Object.prototype.hasOwnProperty.call(input, 'locations')
      ? String(input.locations ?? '').trim() || 'All'
      : previous.locations ?? 'All'
    let archivedAt = previous.archived_at
    if (Object.prototype.hasOwnProperty.call(input, 'archivedAt')) {
      archivedAt = input.archivedAt ? new Date() : null
    }

    await client.query(
      `UPDATE platform.roles
       SET name = $2,
           department_id = $3,
           description = $4,
           goals = $5::jsonb,
           locations = $6,
           archived_at = $7,
           updated_at = now()
       WHERE id = $1`,
      [
        id,
        name,
        departmentId,
        description,
        JSON.stringify(goals),
        locations,
        archivedAt,
      ],
    )
    if (name !== previous.name) {
      await client.query(
        `UPDATE platform.employees SET role = $2, updated_at = now()
         WHERE role_id = $1`,
        [id, name],
      )
    }
    await appendActivityEvent(client, {
      eventKey: 'role.updated',
      entityType: 'role',
      entityId: id,
      ...actor,
      summary: `Updated role ${name}`,
      metadata: { roleId: id },
      source: 'api',
    })
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
  return getRole(id)
}

async function writeMatrix(client, roleId, requested) {
  const skillIds = [
    ...new Set(
      requested
        .map((row) => String(row?.skillId ?? '').trim())
        .filter(Boolean),
    ),
  ]
  let known = new Set()
  if (skillIds.length > 0) {
    const { rows: skillRows } = await client.query(
      `SELECT id FROM platform.skills
       WHERE deleted_at IS NULL AND id = ANY($1::text[])`,
      [skillIds],
    )
    known = new Set(skillRows.map((row) => row.id))
  }

  await client.query(
    `DELETE FROM platform.role_skill_expectations WHERE role_id = $1`,
    [roleId],
  )
  await client.query(`DELETE FROM platform.role_skills WHERE role_id = $1`, [
    roleId,
  ])

  for (const row of requested) {
    const skillId = String(row?.skillId ?? '').trim()
    if (!skillId || !known.has(skillId)) continue
    const weight = Number(row.weightPct)
    await client.query(
      `INSERT INTO platform.role_skills (role_id, skill_id, weight_pct)
       VALUES ($1, $2, $3)`,
      [roleId, skillId, Number.isFinite(weight) ? weight : 0],
    )
    const expectations =
      row.expectations && typeof row.expectations === 'object'
        ? row.expectations
        : {}
    const descriptions =
      row.descriptions && typeof row.descriptions === 'object'
        ? row.descriptions
        : {}
    const grades = new Set([
      ...Object.keys(expectations),
      ...Object.keys(descriptions),
    ])
    for (const jobGrade of grades) {
      const grade = String(jobGrade ?? '').trim()
      if (!grade) continue
      await client.query(
        `INSERT INTO platform.role_skill_expectations (
           role_id, skill_id, job_grade, expected_level, description
         ) VALUES ($1, $2, $3, $4, $5)`,
        [
          roleId,
          skillId,
          grade,
          parseLevel(expectations[grade]),
          String(descriptions[grade] ?? '').trim(),
        ],
      )
    }
  }
  return skillIds
}

export async function replaceRoleMatrix(roleId, skillsInput, platformUser) {
  const id = String(roleId ?? '').trim()
  if (!id) throw new HttpError(400, 'Role id is required.')
  const actor = actorFromUser(platformUser)
  const requested = Array.isArray(skillsInput) ? skillsInput : []
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows: roleRows } = await client.query(
      `SELECT id, name FROM platform.roles WHERE id = $1 FOR UPDATE`,
      [id],
    )
    if (!roleRows[0]) throw new HttpError(404, 'Role not found.')

    const skillIds = await writeMatrix(client, id, requested)

    await appendActivityEvent(client, {
      eventKey: 'role.matrix_updated',
      entityType: 'role',
      entityId: id,
      ...actor,
      summary: `Updated competency matrix for ${roleRows[0].name}`,
      metadata: { roleId: id, skillIds },
      source: 'api',
    })
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
  return getRole(id)
}

export async function duplicateRole(roleId, platformUser) {
  const source = await getRole(roleId)
  if (!source) throw new HttpError(404, 'Role not found.')
  const baseName = `${source.name} (copy)`
  let name = baseName
  let attempt = 2
  while (true) {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT id FROM platform.roles WHERE lower(name) = lower($1) LIMIT 1`,
      [name],
    )
    if (!rows[0]) break
    name = `${source.name} (copy ${attempt})`
    attempt += 1
  }

  const created = await createRole(
    {
      name,
      departmentId: source.departmentId,
      description: source.description,
      goals: source.goals,
      locations: source.locations,
    },
    platformUser,
  )
  if (source.skills.length === 0) return created
  return replaceRoleMatrix(created.id, source.skills, platformUser)
}
