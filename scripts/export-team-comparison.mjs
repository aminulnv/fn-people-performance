import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool } from '../../NEXT-Performance/server/db.mjs'
import {
  revolutLogin,
  revolutRequest,
} from '../../NEXT-Performance/server/revolutHttp.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDirectory = path.resolve(__dirname, '..')

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

function csvValue(value) {
  if (value == null) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function toCsv(rows, columns) {
  const lines = [columns.map(({ label }) => csvValue(label)).join(',')]
  for (const row of rows) {
    lines.push(columns.map(({ key }) => csvValue(row[key])).join(','))
  }
  return `${lines.join('\n')}\n`
}

async function fetchAllTeams(sessionToken) {
  const teams = []
  const pageSize = 100
  let page = 1

  while (true) {
    const response = await revolutRequest(sessionToken, '/teams', {
      page,
      page_size: pageSize,
    })
    const batch = Array.isArray(response?.results) ? response.results : []
    teams.push(...batch)

    if (
      batch.length === 0 ||
      batch.length < pageSize ||
      (Number.isFinite(response?.count) && teams.length >= response.count)
    ) {
      return teams
    }
    page += 1
  }
}

async function fetchRdsTeams() {
  const result = await getPool().query(`
    SELECT
      t.id,
      t.name,
      t.department_id,
      d.name AS department_name,
      t.owner_employee_id,
      owner.name AS owner_name,
      owner.email AS owner_email,
      t.revolut_id,
      t.revolut_department_id,
      t.revolut_owner_id,
      t.status,
      t.team_function,
      t.mission,
      t.revolut_updated_at,
      t.created_at,
      t.updated_at
    FROM platform.teams t
    JOIN platform.departments d ON d.id = t.department_id
    LEFT JOIN platform.employees owner
      ON owner.employee_id = t.owner_employee_id
    ORDER BY d.name, t.name
  `)
  return result.rows
}

function groupBy(rows, keyForRow) {
  const grouped = new Map()
  for (const row of rows) {
    const key = keyForRow(row)
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  return grouped
}

function revolutPairKey(team) {
  return `${normalize(team.department?.name)}\u0000${normalize(team.name)}`
}

function rdsPairKey(team) {
  return `${normalize(team.department_name)}\u0000${normalize(team.name)}`
}

function compareTeams(revolutTeams, rdsTeams) {
  const comparisons = []
  const matchedRevolut = new Set()
  const matchedRds = new Set()
  const rdsByPair = groupBy(rdsTeams, rdsPairKey)

  for (const revolut of revolutTeams) {
    const candidates = rdsByPair
      .get(revolutPairKey(revolut))
      ?.filter((candidate) => !matchedRds.has(candidate))
    const rds = candidates?.[0]
    if (!rds) continue
    matchedRevolut.add(revolut)
    matchedRds.add(rds)

    const ownerMatches =
      rds.revolut_owner_id != null
        ? Number(revolut.team_owner?.id ?? 0) ===
          Number(rds.revolut_owner_id ?? 0)
        : normalize(revolut.team_owner?.full_name) === normalize(rds.owner_name)
    const discrepancy = [
      !ownerMatches ? 'Owner mismatch' : '',
      rds.status && rds.status !== revolut.status?.id
        ? 'Status mismatch'
        : '',
      rds.team_function !== undefined &&
      rds.team_function !== (revolut.team_function?.id ?? null)
        ? 'Team function mismatch'
        : '',
      rds.mission !== undefined &&
      rds.mission !== (revolut.mission?.trim() || null)
        ? 'Mission mismatch'
        : '',
    ].filter(Boolean)

    comparisons.push(
      comparisonRow(
        discrepancy.length ? discrepancy.join('; ') : 'Aligned',
        revolut,
        rds,
      ),
    )
  }

  const unmatchedRevolut = revolutTeams.filter(
    (team) => !matchedRevolut.has(team),
  )
  const unmatchedRds = rdsTeams.filter((team) => !matchedRds.has(team))
  const rdsByName = groupBy(unmatchedRds, (team) => normalize(team.name))

  for (const revolut of unmatchedRevolut) {
    const candidates = rdsByName
      .get(normalize(revolut.name))
      ?.filter((candidate) => !matchedRds.has(candidate))
    const rds = candidates?.length === 1 ? candidates[0] : null
    if (!rds) continue
    matchedRevolut.add(revolut)
    matchedRds.add(rds)
    comparisons.push(comparisonRow('Department mismatch', revolut, rds))
  }

  for (const revolut of revolutTeams) {
    if (!matchedRevolut.has(revolut)) {
      comparisons.push(comparisonRow('Only in Revolut', revolut, null))
    }
  }
  for (const rds of rdsTeams) {
    if (!matchedRds.has(rds)) {
      comparisons.push(comparisonRow('Only in RDS', null, rds))
    }
  }

  return comparisons.sort((left, right) => {
    const leftAligned = left.discrepancy === 'Aligned' ? 1 : 0
    const rightAligned = right.discrepancy === 'Aligned' ? 1 : 0
    return (
      leftAligned - rightAligned ||
      left.team_name.localeCompare(right.team_name)
    )
  })
}

function comparisonRow(discrepancy, revolut, rds) {
  return {
    discrepancy,
    revolut_id: revolut?.id ?? '',
    rds_id: rds?.id ?? '',
    team_name: revolut?.name ?? rds?.name ?? '',
    revolut_department: revolut?.department?.name ?? '',
    rds_department: rds?.department_name ?? '',
    revolut_owner_id: revolut?.team_owner?.id ?? '',
    rds_owner_id: rds?.owner_employee_id ?? '',
    rds_revolut_owner_id: rds?.revolut_owner_id ?? '',
    revolut_owner: revolut?.team_owner?.full_name ?? '',
    rds_owner: rds?.owner_name ?? '',
    revolut_status: revolut?.status?.id ?? '',
    rds_status: rds?.status ?? '',
    revolut_team_function: revolut?.team_function?.id ?? '',
    rds_team_function: rds?.team_function ?? '',
    revolut_updated_at: revolut?.updated_date_time ?? '',
    rds_updated_at: rds?.updated_at?.toISOString?.() ?? rds?.updated_at ?? '',
  }
}

const revolutColumns = [
  ['id', 'id'],
  ['name', 'name'],
  ['department_id', 'department_id'],
  ['department_name', 'department_name'],
  ['team_owner_id', 'team_owner_id'],
  ['team_owner_name', 'team_owner_name'],
  ['status', 'status'],
  ['status_name', 'status_name'],
  ['team_function', 'team_function'],
  ['team_function_name', 'team_function_name'],
  ['mission', 'mission'],
  ['updated_date_time', 'updated_date_time'],
].map(([key, label]) => ({ key, label }))

const comparisonColumns = [
  'discrepancy',
  'revolut_id',
  'rds_id',
  'team_name',
  'revolut_department',
  'rds_department',
  'revolut_owner_id',
  'rds_owner_id',
  'rds_revolut_owner_id',
  'revolut_owner',
  'rds_owner',
  'revolut_status',
  'rds_status',
  'revolut_team_function',
  'rds_team_function',
  'revolut_updated_at',
  'rds_updated_at',
].map((key) => ({ key, label: key }))

async function main() {
  const email = requiredEnvironmentVariable('REVOLUT_EMAIL')
  const apiToken = requiredEnvironmentVariable('REVOLUT_TOKEN')
  const sessionToken = await revolutLogin(email, apiToken)

  const [revolutTeams, rdsTeams] = await Promise.all([
    fetchAllTeams(sessionToken),
    fetchRdsTeams(),
  ])
  const comparisons = compareTeams(revolutTeams, rdsTeams)
  const revolutRows = revolutTeams.map((team) => ({
    id: team.id,
    name: team.name,
    department_id: team.department?.id,
    department_name: team.department?.name,
    team_owner_id: team.team_owner?.id,
    team_owner_name: team.team_owner?.full_name,
    status: team.status?.id,
    status_name: team.status?.name,
    team_function: team.team_function?.id,
    team_function_name: team.team_function?.name,
    mission: team.mission,
    updated_date_time: team.updated_date_time,
  }))

  await Promise.all([
    fs.writeFile(
      path.join(outputDirectory, 'revolut-teams.csv'),
      toCsv(revolutRows, revolutColumns),
    ),
    fs.writeFile(
      path.join(outputDirectory, 'team-discrepancies.csv'),
      toCsv(comparisons, comparisonColumns),
    ),
    fs.writeFile(
      path.join(outputDirectory, 'team-comparison.json'),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          revolutCount: revolutTeams.length,
          rdsCount: rdsTeams.length,
          comparisons,
        },
        null,
        2,
      )}\n`,
    ),
  ])

  const counts = Object.fromEntries(
    [...new Set(comparisons.map(({ discrepancy }) => discrepancy))].map(
      (discrepancy) => [
        discrepancy,
        comparisons.filter((row) => row.discrepancy === discrepancy).length,
      ],
    ),
  )
  console.log(
    JSON.stringify({
      revolutCount: revolutTeams.length,
      revolutActiveCount: revolutTeams.filter(
        (team) => team.status?.id === 'active',
      ).length,
      revolutArchivedCount: revolutTeams.filter(
        (team) => team.status?.id === 'archived',
      ).length,
      rdsCount: rdsTeams.length,
      activeOnlyInRevolutCount: comparisons.filter(
        (row) =>
          row.discrepancy === 'Only in Revolut' &&
          row.revolut_status === 'active',
      ).length,
      archivedOnlyInRevolutCount: comparisons.filter(
        (row) =>
          row.discrepancy === 'Only in Revolut' &&
          row.revolut_status === 'archived',
      ).length,
      counts,
    }),
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await getPool().end().catch(() => {})
  })
