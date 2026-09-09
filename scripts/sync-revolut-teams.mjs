import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool } from '../../NEXT-Performance/server/db.mjs'
import {
  revolutLogin,
  revolutRequest,
} from '../../NEXT-Performance/server/revolutHttp.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDirectory = path.resolve(__dirname, '..')

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

function csvValue(value) {
  if (value == null) return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function toCsv(rows, columns) {
  return `${[
    columns.join(','),
    ...rows.map((row) =>
      columns.map((column) => csvValue(row[column])).join(','),
    ),
  ].join('\n')}\n`
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

function onlyCandidate(index, key, usedIds = new Set()) {
  const candidates = (index.get(key) ?? []).filter(
    (candidate) => !usedIds.has(candidate.id),
  )
  return candidates.length === 1 ? candidates[0] : null
}

function teamPairKey(name, departmentName) {
  return `${normalize(departmentName)}\u0000${normalize(name)}`
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

function validateSourceTeams(teams) {
  const ids = new Set()
  const pairs = new Set()
  for (const team of teams) {
    if (!Number.isInteger(team.id)) {
      throw new Error(`Revolut team has invalid ID: ${team.id}`)
    }
    if (ids.has(team.id)) throw new Error(`Duplicate Revolut team ID ${team.id}`)
    ids.add(team.id)

    const name = nullableText(team.name)
    const departmentName = nullableText(team.department?.name)
    if (!name || !departmentName) {
      throw new Error(`Revolut team ${team.id} is missing name or department`)
    }
    const pair = teamPairKey(name, departmentName)
    if (pairs.has(pair)) {
      throw new Error(`Duplicate Revolut team/department pair: ${name}`)
    }
    pairs.add(pair)
  }
}

async function createBackup(client, revolutTeams) {
  const [teamsResult, assignmentsResult] = await Promise.all([
    client.query(`
      SELECT t.*, d.name AS department_name, owner.name AS owner_name
      FROM platform.teams t
      JOIN platform.departments d ON d.id = t.department_id
      LEFT JOIN platform.employees owner
        ON owner.employee_id = t.owner_employee_id
      ORDER BY t.id
    `),
    client.query(`
      SELECT employee_id, email, name, department_id, team_id
      FROM platform.employees
      ORDER BY employee_id
    `),
  ])
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
  const backupDirectory = path.join(rootDirectory, 'backups', `team-sync-${stamp}`)
  await fs.mkdir(backupDirectory, { recursive: true })
  await Promise.all([
    fs.writeFile(
      path.join(backupDirectory, 'rds-teams-before.csv'),
      toCsv(teamsResult.rows, Object.keys(teamsResult.rows[0] ?? {})),
    ),
    fs.writeFile(
      path.join(backupDirectory, 'rds-employee-assignments-before.csv'),
      toCsv(
        assignmentsResult.rows,
        Object.keys(assignmentsResult.rows[0] ?? {}),
      ),
    ),
    fs.writeFile(
      path.join(backupDirectory, 'revolut-teams-source.json'),
      `${JSON.stringify(revolutTeams, null, 2)}\n`,
    ),
  ])
  return backupDirectory
}

async function ensureDepartments(client, revolutTeams) {
  const result = await client.query(
    'SELECT id, name FROM platform.departments ORDER BY id',
  )
  const departments = new Map(
    result.rows.map((row) => [normalize(row.name), row.id]),
  )
  for (const team of revolutTeams) {
    const name = team.department.name.trim()
    const key = normalize(name)
    if (departments.has(key)) continue
    const inserted = await client.query(
      'INSERT INTO platform.departments (name) VALUES ($1) RETURNING id',
      [name],
    )
    departments.set(key, inserted.rows[0].id)
  }
  return departments
}

async function mirrorTeams(
  client,
  revolutTeams,
  revolutEmployees,
  platformEmployees,
) {
  const currentResult = await client.query(`
    SELECT t.*, d.name AS department_name
    FROM platform.teams t
    JOIN platform.departments d ON d.id = t.department_id
    ORDER BY t.id
  `)
  const currentTeams = currentResult.rows
  const currentByRevolutId = uniqueIndex(currentTeams, (team) =>
    team.revolut_id == null ? '' : String(team.revolut_id),
  )
  const currentByPair = uniqueIndex(currentTeams, (team) =>
    teamPairKey(team.name, team.department_name),
  )
  const currentByName = uniqueIndex(currentTeams, (team) =>
    normalize(team.name),
  )
  const usedTeamIds = new Set()
  const localTeamIdByRevolutId = new Map()
  const departments = await ensureDepartments(client, revolutTeams)
  const resolvePlatformEmployee = makePlatformEmployeeResolver(
    platformEmployees,
    revolutEmployees,
  )

  await client.query(
    `UPDATE platform.teams
     SET name = '__revolut_sync_old_' || id::text`,
  )

  for (const team of revolutTeams) {
    const departmentId = departments.get(normalize(team.department.name))
    let existing = onlyCandidate(
      currentByRevolutId,
      String(team.id),
      usedTeamIds,
    )
    existing ??= onlyCandidate(
      currentByPair,
      teamPairKey(team.name, team.department.name),
      usedTeamIds,
    )
    existing ??= onlyCandidate(
      currentByName,
      normalize(team.name),
      usedTeamIds,
    )
    const ownerEmployeeId =
      resolvePlatformEmployee(team.team_owner?.id)?.employee_id ?? null
    const values = [
      departmentId,
      team.name.trim(),
      ownerEmployeeId,
      team.id,
      team.department.id,
      team.team_owner?.id ?? null,
      team.status?.id ?? 'active',
      nullableText(team.team_function?.id),
      nullableText(team.mission),
      nullableText(team.updated_date_time),
    ]

    let localTeamId
    if (existing) {
      await client.query(
        `UPDATE platform.teams SET
           department_id = $1,
           name = $2,
           owner_employee_id = $3,
           revolut_id = $4,
           revolut_department_id = $5,
           revolut_owner_id = $6,
           status = $7,
           team_function = $8,
           mission = $9,
           revolut_updated_at = $10,
           updated_at = now()
         WHERE id = $11`,
        [...values, existing.id],
      )
      localTeamId = existing.id
      usedTeamIds.add(existing.id)
    } else {
      const inserted = await client.query(
        `INSERT INTO platform.teams (
           department_id, name, owner_employee_id, revolut_id,
           revolut_department_id, revolut_owner_id, status, team_function,
           mission, revolut_updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        values,
      )
      localTeamId = inserted.rows[0].id
    }
    localTeamIdByRevolutId.set(String(team.id), {
      teamId: localTeamId,
      departmentId,
    })
  }

  return {
    currentTeams,
    usedTeamIds,
    localTeamIdByRevolutId,
    resolvePlatformEmployee,
  }
}

async function mirrorEmployeeAssignments(
  client,
  revolutEmployees,
  localTeamIdByRevolutId,
  resolvePlatformEmployee,
) {
  const updatedPlatformEmployeeIds = new Set()
  let updated = 0
  for (const revolutEmployee of revolutEmployees) {
    const platformEmployee = resolvePlatformEmployee(revolutEmployee)
    if (
      !platformEmployee ||
      updatedPlatformEmployeeIds.has(platformEmployee.employee_id)
    ) {
      continue
    }
    updatedPlatformEmployeeIds.add(platformEmployee.employee_id)
    const target = localTeamIdByRevolutId.get(
      String(revolutEmployee.team?.id ?? ''),
    )
    await client.query(
      `UPDATE platform.employees
       SET team_id = $1,
           department_id = COALESCE($2, department_id),
           updated_at = now()
       WHERE employee_id = $3`,
      [
        target?.teamId ?? null,
        target?.departmentId ?? null,
        platformEmployee.employee_id,
      ],
    )
    updated += 1
  }
  return updated
}

async function deleteRdsOnlyTeams(client, currentTeams, usedTeamIds) {
  const ids = currentTeams
    .filter((team) => !usedTeamIds.has(team.id))
    .map((team) => team.id)
  if (ids.length === 0) return 0
  await client.query(
    'UPDATE platform.employees SET team_id = NULL WHERE team_id = ANY($1::bigint[])',
    [ids],
  )
  const result = await client.query(
    'DELETE FROM platform.teams WHERE id = ANY($1::bigint[])',
    [ids],
  )
  return result.rowCount
}

async function verifyParity(client, revolutTeams) {
  const result = await client.query(`
    SELECT
      t.revolut_id,
      t.name,
      t.revolut_department_id,
      d.name AS department_name,
      t.revolut_owner_id,
      t.status,
      t.team_function,
      t.mission,
      t.revolut_updated_at
    FROM platform.teams t
    JOIN platform.departments d ON d.id = t.department_id
    ORDER BY t.revolut_id
  `)
  const expectedById = new Map(
    revolutTeams.map((team) => [String(team.id), team]),
  )
  const mismatches = []
  for (const row of result.rows) {
    const expected = expectedById.get(String(row.revolut_id))
    if (!expected) {
      mismatches.push(`Unexpected RDS team ${row.name}`)
      continue
    }
    const fieldsMatch =
      row.name === expected.name.trim() &&
      Number(row.revolut_department_id) === Number(expected.department.id) &&
      row.department_name === expected.department.name.trim() &&
      Number(row.revolut_owner_id ?? 0) ===
        Number(expected.team_owner?.id ?? 0) &&
      row.status === (expected.status?.id ?? 'active') &&
      (row.team_function ?? null) ===
        nullableText(expected.team_function?.id) &&
      (row.mission ?? null) === nullableText(expected.mission)
    if (!fieldsMatch) mismatches.push(`Field mismatch for ${expected.name}`)
    expectedById.delete(String(row.revolut_id))
  }
  for (const missing of expectedById.values()) {
    mismatches.push(`Missing RDS team ${missing.name}`)
  }
  if (mismatches.length > 0 || result.rows.length !== revolutTeams.length) {
    throw new Error(`Parity verification failed: ${mismatches.join('; ')}`)
  }
  return result.rows.length
}

async function main() {
  const email = requiredEnvironmentVariable('REVOLUT_EMAIL')
  const apiToken = requiredEnvironmentVariable('REVOLUT_TOKEN')
  const sessionToken = await revolutLogin(email, apiToken)
  const [revolutTeams, revolutEmployees] = await Promise.all([
    fetchAllPages(sessionToken, '/teams'),
    fetchAllPages(sessionToken, '/employees'),
  ])
  validateSourceTeams(revolutTeams)

  const pool = getPool()
  const client = await pool.connect()
  let backupDirectory = ''
  try {
    const platformEmployees = (
      await client.query(
        'SELECT employee_id, email, name FROM platform.employees ORDER BY employee_id',
      )
    ).rows
    backupDirectory = await createBackup(client, revolutTeams)

    await client.query('BEGIN')
    const {
      currentTeams,
      usedTeamIds,
      localTeamIdByRevolutId,
      resolvePlatformEmployee,
    } = await mirrorTeams(
      client,
      revolutTeams,
      revolutEmployees,
      platformEmployees,
    )
    const employeeAssignmentsUpdated = await mirrorEmployeeAssignments(
      client,
      revolutEmployees,
      localTeamIdByRevolutId,
      resolvePlatformEmployee,
    )
    const deletedTeams = await deleteRdsOnlyTeams(
      client,
      currentTeams,
      usedTeamIds,
    )
    const verifiedTeams = await verifyParity(client, revolutTeams)
    await client.query('COMMIT')

    console.log(
      JSON.stringify({
        backupDirectory,
        revolutTeams: revolutTeams.length,
        verifiedTeams,
        employeeAssignmentsUpdated,
        deletedRdsOnlyTeams: deletedTeams,
      }),
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
