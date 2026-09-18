/**
 * Sync platform.roles (+ employees.role / role_id) from Revolut People specialisation,
 * and attach each role to a platform department from Revolut team.department.
 *
 * Usage (from repo root, with NEXT-Performance credentials available):
 *   set -a && source ../NEXT-Performance/.env && set +a
 *   node scripts/sync-revolut-roles.mjs
 */
import { getPool } from '../../NEXT-Performance/server/db.mjs'
import {
  revolutLogin,
  revolutRequest,
} from '../../NEXT-Performance/server/revolutHttp.mjs'
import crypto from 'node:crypto'

function requiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en')
}

function nullableText(value) {
  const text = String(value ?? '').trim()
  return text || null
}

function nestedName(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    return String(value.name ?? value.label ?? value.display_name ?? '').trim()
  }
  return String(value).trim()
}

function employeeName(employee) {
  const combined = [employee?.first_name, employee?.last_name]
    .map(nullableText)
    .filter(Boolean)
    .join(' ')
  return (
    nullableText(employee?.full_name) ??
    nullableText(combined) ??
    nullableText(employee?.name) ??
    ''
  )
}

function employeeEmail(employee) {
  return normalize(
    employee?.email ?? employee?.work_email ?? employee?.workEmail,
  )
}

/** Revolut People specialisation → platform role. */
function employeeRole(employee) {
  return nestedName(employee?.specialisation)
}

/** Revolut department name (team.department preferred, then top-level). */
function employeeDepartment(employee) {
  const fromTeam = nestedName(employee?.team?.department)
  if (fromTeam) return fromTeam
  return nestedName(employee?.department)
}

async function ensureDepartment(client, departmentsByName, name) {
  const key = normalize(name)
  if (!key) return null
  const existing = departmentsByName.get(key)
  if (existing) return existing

  const { rows: found } = await client.query(
    `SELECT id, name FROM platform.departments WHERE lower(name) = lower($1) LIMIT 1`,
    [name],
  )
  if (found[0]) {
    departmentsByName.set(key, found[0])
    return found[0]
  }

  const { rows } = await client.query(
    `INSERT INTO platform.departments (name)
     VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [name],
  )
  const department = rows[0]
  departmentsByName.set(key, department)
  return department
}

/**
 * Pick the department with the most Revolut people for a role.
 * Ties break alphabetically for stability.
 */
function majorityDepartment(departmentCounts) {
  let bestName = null
  let bestCount = -1
  for (const [name, count] of departmentCounts) {
    if (
      count > bestCount ||
      (count === bestCount && normalize(name) < normalize(bestName ?? ''))
    ) {
      bestName = name
      bestCount = count
    }
  }
  return bestName
}

async function upsertRole(client, name, departmentId) {
  if (!name) return null
  const { rows: existing } = await client.query(
    `SELECT id, name, department_id FROM platform.roles WHERE lower(name) = lower($1) LIMIT 1`,
    [name],
  )
  if (existing[0]) {
    if (
      departmentId != null &&
      existing[0].department_id !== departmentId
    ) {
      const { rows } = await client.query(
        `UPDATE platform.roles
         SET department_id = $2, updated_at = now()
         WHERE id = $1
         RETURNING id, name, department_id`,
        [existing[0].id, departmentId],
      )
      return { ...rows[0], departmentUpdated: true }
    }
    return { ...existing[0], departmentUpdated: false }
  }

  const id = `role-${crypto.randomUUID()}`
  const { rows } = await client.query(
    `INSERT INTO platform.roles (id, name, department_id)
     SELECT $1, $2, $3
     WHERE NOT EXISTS (
       SELECT 1 FROM platform.roles WHERE lower(name) = lower($2)
     )
     RETURNING id, name, department_id`,
    [id, name, departmentId],
  )
  if (rows[0]) return { ...rows[0], departmentUpdated: departmentId != null }

  const { rows: again } = await client.query(
    `SELECT id, name, department_id FROM platform.roles WHERE lower(name) = lower($1) LIMIT 1`,
    [name],
  )
  if (!again[0]) return null
  if (departmentId != null && again[0].department_id !== departmentId) {
    const { rows } = await client.query(
      `UPDATE platform.roles
       SET department_id = $2, updated_at = now()
       WHERE id = $1
       RETURNING id, name, department_id`,
      [again[0].id, departmentId],
    )
    return { ...rows[0], departmentUpdated: true }
  }
  return { ...again[0], departmentUpdated: false }
}

async function fetchAllPages(token, endpoint) {
  const rows = []
  const pageSize = 100
  for (let page = 1; ; page += 1) {
    const response = await revolutRequest(token, endpoint, {
      page,
      page_size: pageSize,
    })
    const batch = Array.isArray(response?.results) ? response.results : []
    rows.push(...batch)
    if (
      batch.length < pageSize ||
      (Number.isFinite(response?.count) && rows.length >= response.count)
    ) {
      return rows
    }
  }
}

function uniqueIndex(rows, keyForRow) {
  const grouped = new Map()
  for (const row of rows) {
    const key = keyForRow(row)
    if (!key) continue
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  return grouped
}

function onlyCandidate(index, key) {
  const candidates = index.get(key) ?? []
  return candidates.length === 1 ? candidates[0] : null
}

function makePlatformEmployeeResolver(platformEmployees, revolutEmployees) {
  const revolutById = new Map(
    revolutEmployees.map((employee) => [String(employee.id), employee]),
  )
  const platformByEmail = uniqueIndex(platformEmployees, (employee) =>
    normalize(employee.email),
  )
  const platformByName = uniqueIndex(platformEmployees, (employee) =>
    normalize(employee.name),
  )

  return (revolutEmployeeOrId) => {
    const revolutEmployee =
      typeof revolutEmployeeOrId === 'object'
        ? revolutEmployeeOrId
        : revolutById.get(String(revolutEmployeeOrId))
    if (!revolutEmployee) return null

    const email = employeeEmail(revolutEmployee)
    if (email) {
      const emailMatch = onlyCandidate(platformByEmail, email)
      if (emailMatch) return emailMatch
    }
    return onlyCandidate(
      platformByName,
      normalize(employeeName(revolutEmployee)),
    )
  }
}

async function main() {
  const email = requiredEnvironmentVariable('REVOLUT_EMAIL')
  const apiToken = requiredEnvironmentVariable('REVOLUT_TOKEN')
  const sessionToken = await revolutLogin(email, apiToken)
  const revolutEmployees = await fetchAllPages(sessionToken, '/employees')

  const pool = getPool()
  const client = await pool.connect()
  try {
    const platformEmployees = (
      await client.query(
        `SELECT employee_id, email, name, role, role_id
         FROM platform.employees
         ORDER BY employee_id`,
      )
    ).rows

    const departmentsByName = new Map(
      (
        await client.query(`SELECT id, name FROM platform.departments ORDER BY id`)
      ).rows.map((row) => [normalize(row.name), row]),
    )

    // roleName → Map(departmentName → count)
    const roleDepartmentVotes = new Map()
    let withRole = 0
    let withDepartment = 0

    for (const revolutEmployee of revolutEmployees) {
      const role = employeeRole(revolutEmployee)
      if (!role) continue
      withRole += 1

      const department = employeeDepartment(revolutEmployee)
      if (!department) continue
      withDepartment += 1

      const votes = roleDepartmentVotes.get(normalize(role)) ?? new Map()
      if (!roleDepartmentVotes.has(normalize(role))) {
        roleDepartmentVotes.set(normalize(role), votes)
      }
      // Keep canonical casing from first/majority sightings via separate map
      const prior = [...votes.keys()].find((key) => normalize(key) === normalize(department))
      const key = prior ?? department
      votes.set(key, (votes.get(key) ?? 0) + 1)
    }

    // Preserve display name of roles from first Revolut occurrence
    const roleDisplayName = new Map()
    for (const revolutEmployee of revolutEmployees) {
      const role = employeeRole(revolutEmployee)
      if (!role) continue
      const key = normalize(role)
      if (!roleDisplayName.has(key)) roleDisplayName.set(key, role)
    }

    const resolvePlatformEmployee = makePlatformEmployeeResolver(
      platformEmployees,
      revolutEmployees,
    )

    let matched = 0
    let updated = 0
    let unchanged = 0
    let unmatched = 0
    let rolesDepartmentSet = 0
    let rolesDepartmentUnchanged = 0
    let rolesWithoutDepartment = 0
    const unmatchedSamples = []
    const ambiguousRoles = []

    await client.query('BEGIN')

    const roleCatalogByName = new Map()
    for (const [roleKey, votes] of roleDepartmentVotes) {
      const displayName = roleDisplayName.get(roleKey)
      if (!displayName) continue

      if (votes.size > 1) {
        ambiguousRoles.push({
          role: displayName,
          departments: Object.fromEntries(votes),
        })
      }

      const departmentName = majorityDepartment(votes)
      const department = departmentName
        ? await ensureDepartment(client, departmentsByName, departmentName)
        : null
      if (!department) {
        rolesWithoutDepartment += 1
        const catalog = await upsertRole(client, displayName, null)
        if (catalog) roleCatalogByName.set(roleKey, catalog)
        continue
      }

      const catalog = await upsertRole(client, displayName, department.id)
      if (catalog) {
        roleCatalogByName.set(roleKey, catalog)
        if (catalog.departmentUpdated) rolesDepartmentSet += 1
        else rolesDepartmentUnchanged += 1
      }
    }

    // Roles seen without any department vote still get catalog rows
    for (const [roleKey, displayName] of roleDisplayName) {
      if (roleCatalogByName.has(roleKey)) continue
      rolesWithoutDepartment += 1
      const catalog = await upsertRole(client, displayName, null)
      if (catalog) roleCatalogByName.set(roleKey, catalog)
    }

    for (const revolutEmployee of revolutEmployees) {
      const role = employeeRole(revolutEmployee)
      const platformEmployee = resolvePlatformEmployee(revolutEmployee)
      if (!platformEmployee) {
        unmatched += 1
        if (unmatchedSamples.length < 10) {
          unmatchedSamples.push({
            revolutId: revolutEmployee.id,
            email: employeeEmail(revolutEmployee) || null,
            name: employeeName(revolutEmployee) || null,
            role: role || null,
            department: employeeDepartment(revolutEmployee) || null,
          })
        }
        continue
      }

      matched += 1
      const catalog = role
        ? roleCatalogByName.get(normalize(role)) ??
          (await upsertRole(client, role, null))
        : null
      const previousRole = String(platformEmployee.role ?? '')
      const previousRoleId = platformEmployee.role_id ?? null
      const nextRoleId = catalog?.id ?? null
      if (previousRole === role && previousRoleId === nextRoleId) {
        unchanged += 1
        continue
      }

      await client.query(
        `UPDATE platform.employees
         SET role = $2, role_id = $3, updated_at = now()
         WHERE employee_id = $1`,
        [platformEmployee.employee_id, role, nextRoleId],
      )
      platformEmployee.role = role
      platformEmployee.role_id = nextRoleId
      updated += 1
    }
    await client.query('COMMIT')

    const rolesWithDepartment = (
      await client.query(
        `SELECT count(*)::int AS n FROM platform.roles WHERE department_id IS NOT NULL AND archived_at IS NULL`,
      )
    ).rows[0].n

    console.log(
      JSON.stringify(
        {
          revolutEmployees: revolutEmployees.length,
          revolutWithRole: withRole,
          revolutWithRoleAndDepartment: withDepartment,
          distinctRoles: roleDisplayName.size,
          rolesDepartmentSet,
          rolesDepartmentUnchanged,
          rolesWithoutDepartment,
          rolesWithDepartmentInDb: rolesWithDepartment,
          ambiguousRoleCount: ambiguousRoles.length,
          ambiguousRoles: ambiguousRoles.slice(0, 20),
          platformEmployees: platformEmployees.length,
          matched,
          updated,
          unchanged,
          unmatched,
          unmatchedSamples,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
})
