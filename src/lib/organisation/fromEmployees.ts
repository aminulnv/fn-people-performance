import type {
  PlatformDepartment,
  PlatformEmployee,
  PlatformTeam,
} from '@/lib/employees/types'
import type {
  OrgDepartment,
  OrgPersonRef,
  OrgTeam,
  OrganisationSnapshot,
} from './types'

const UNASSIGNED = 'Unassigned'

function normalizeLabel(value: string): string {
  const trimmed = value.trim()
  return trimmed || UNASSIGNED
}

export function departmentKey(name: string): string {
  return normalizeLabel(name).toLowerCase()
}

function teamKey(departmentName: string, teamName: string): string {
  return `${departmentKey(departmentName)}::${normalizeLabel(teamName).toLowerCase()}`
}

function personFromEmployee(employee: PlatformEmployee): OrgPersonRef {
  return {
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    avatarUrl: employee.avatarUrl || undefined,
  }
}

function resolvePersonById(
  employeeId: number | undefined,
  employeesById: Map<number, PlatformEmployee>,
  fallbackName: string,
): OrgPersonRef | null {
  const name = fallbackName.trim()
  if (employeeId != null) {
    const match = employeesById.get(employeeId)
    if (match) return personFromEmployee(match)
  }
  if (!name) return null
  return { fullName: name }
}

function personKey(ref: OrgPersonRef): string {
  return ref.employeeId != null
    ? `id:${ref.employeeId}`
    : `name:${ref.fullName.toLowerCase()}`
}

function pickMostCommon(
  counts: Map<string, { count: number; ref: OrgPersonRef }>,
  preferNot?: OrgPersonRef | null,
): OrgPersonRef | null {
  let best: { count: number; ref: OrgPersonRef } | null = null
  const avoidKey = preferNot ? personKey(preferNot) : null

  for (const entry of counts.values()) {
    if (!best) {
      best = entry
      continue
    }
    if (entry.count > best.count) {
      best = entry
      continue
    }
    if (entry.count < best.count) continue

    // Tie-break: prefer someone who is not the department head, then name.
    if (avoidKey) {
      const entryAvoided = personKey(entry.ref) === avoidKey
      const current = best
      const currentAvoided = personKey(current.ref) === avoidKey
      if (entryAvoided !== currentAvoided) {
        if (currentAvoided) best = entry
        continue
      }
    }
    if (entry.ref.fullName.localeCompare(best.ref.fullName) < 0) {
      best = entry
    }
  }
  return best?.ref ?? null
}

/**
 * Team manager = person with the most direct reports on the team.
 * Falls back to the most common reports-to among members.
 * Ties prefer a non–department-head.
 */
function resolveTeamManager(
  members: PlatformEmployee[],
  employeesById: Map<number, PlatformEmployee>,
  departmentHead: OrgPersonRef | null,
): OrgPersonRef | null {
  const memberIds = new Set(members.map((m) => m.employeeId))
  const memberNames = new Set(
    members.map((m) => m.fullName.trim().toLowerCase()).filter(Boolean),
  )

  const inbound = new Map<string, { count: number; ref: OrgPersonRef }>()
  const outbound = new Map<string, { count: number; ref: OrgPersonRef }>()

  for (const member of members) {
    const manager = resolvePersonById(
      member.reportsToId,
      employeesById,
      member.reportsToName,
    )
    if (!manager) continue

    const key = personKey(manager)
    const outboundEntry = outbound.get(key)
    if (outboundEntry) outboundEntry.count += 1
    else outbound.set(key, { count: 1, ref: manager })

    const managerOnTeam =
      (manager.employeeId != null && memberIds.has(manager.employeeId)) ||
      memberNames.has(manager.fullName.trim().toLowerCase())
    if (!managerOnTeam) continue

    const inboundEntry = inbound.get(key)
    if (inboundEntry) inboundEntry.count += 1
    else inbound.set(key, { count: 1, ref: manager })
  }

  return (
    pickMostCommon(inbound, departmentHead) ??
    pickMostCommon(outbound, departmentHead)
  )
}

/** Most common department head name/id among members. */
function resolveDepartmentHead(
  members: PlatformEmployee[],
  employeesById: Map<number, PlatformEmployee>,
): OrgPersonRef | null {
  const counts = new Map<string, { count: number; ref: OrgPersonRef }>()

  for (const member of members) {
    const ref = resolvePersonById(
      member.departmentHeadId,
      employeesById,
      member.departmentHeadName,
    )
    if (!ref) continue
    const key =
      ref.employeeId != null
        ? `id:${ref.employeeId}`
        : `name:${ref.fullName.toLowerCase()}`
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(key, { count: 1, ref })
    }
  }

  let best: { count: number; ref: OrgPersonRef } | null = null
  for (const entry of counts.values()) {
    if (
      !best ||
      entry.count > best.count ||
      (entry.count === best.count &&
        entry.ref.fullName.localeCompare(best.ref.fullName) < 0)
    ) {
      best = entry
    }
  }
  return best?.ref ?? null
}

/**
 * Build department → team hierarchy from the People directory.
 * Active employees only; empty department/team labels become "Unassigned".
 */
export function buildOrganisationFromEmployees(
  employees: PlatformEmployee[],
): OrganisationSnapshot {
  const active = employees.filter((e) => e.isActive)
  const employeesById = new Map(active.map((e) => [e.employeeId, e]))

  type TeamBucket = {
    departmentName: string
    teamName: string
    members: PlatformEmployee[]
  }
  type DeptBucket = {
    departmentName: string
    members: PlatformEmployee[]
    teams: Map<string, TeamBucket>
  }

  const departments = new Map<string, DeptBucket>()

  for (const employee of active) {
    const departmentName = normalizeLabel(employee.department)
    const teamName = normalizeLabel(employee.team)
    const dKey = departmentKey(departmentName)
    let dept = departments.get(dKey)
    if (!dept) {
      dept = {
        departmentName,
        members: [],
        teams: new Map(),
      }
      departments.set(dKey, dept)
    }
    dept.members.push(employee)

    const tKey = teamKey(departmentName, teamName)
    let team = dept.teams.get(tKey)
    if (!team) {
      team = { departmentName, teamName, members: [] }
      dept.teams.set(tKey, team)
    }
    team.members.push(employee)
  }

  const orgDepartments: OrgDepartment[] = [...departments.entries()]
    .map(([id, dept]) => {
      const head = resolveDepartmentHead(dept.members, employeesById)
      const teams: OrgTeam[] = [...dept.teams.entries()]
        .map(([teamId, team]) => ({
          id: teamId,
          name: team.teamName,
          departmentName: dept.departmentName,
          manager: resolveTeamManager(team.members, employeesById, head),
          headcount: team.members.length,
          memberIds: team.members.map((m) => m.employeeId),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      return {
        id,
        name: dept.departmentName,
        head,
        hrbp: null,
        headcount: dept.members.length,
        teams,
        memberIds: dept.members.map((m) => m.employeeId),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const teams = orgDepartments
    .flatMap((dept) => dept.teams)
    .sort((a, b) => {
      const byDept = a.departmentName.localeCompare(b.departmentName)
      if (byDept !== 0) return byDept
      return a.name.localeCompare(b.name)
    })

  return { departments: orgDepartments, teams }
}

function catalogPerson(
  employeeId: number | null,
  name: string | null,
): OrgPersonRef | null {
  const fullName = name?.trim() ?? ''
  if (employeeId == null && !fullName) return null
  return {
    ...(employeeId != null ? { employeeId } : {}),
    fullName,
  }
}

function sortedTeams(teams: OrgTeam[]): OrgTeam[] {
  return [...teams].sort((a, b) => {
    const byDept = a.departmentName.localeCompare(b.departmentName)
    if (byDept !== 0) return byDept
    return a.name.localeCompare(b.name)
  })
}

/**
 * Fold Revolut/API catalogs into the employee-derived snapshot so empty
 * departments and teams still appear, and Unassigned buckets do not.
 */
export function mergeOrganisationWithCatalog(
  snapshot: OrganisationSnapshot,
  catalog: PlatformDepartment[],
  teams: PlatformTeam[] = [],
): OrganisationSnapshot {
  const matchCatalog = catalog.length > 0 || teams.length > 0
  const byKey = new Map(
    snapshot.departments
      .filter((department) => !matchCatalog || department.name !== UNASSIGNED)
      .map((department) => [
        department.id,
        {
          ...department,
          teams: matchCatalog
            ? department.teams.filter((team) => team.name !== UNASSIGNED)
            : department.teams,
        },
      ]),
  )

  for (const row of catalog) {
    const name = row.name.trim()
    if (!name) continue
    const key = departmentKey(name)
    const existing = byKey.get(key)
    const catalogHead = catalogPerson(row.headEmployeeId, row.headName)

    if (existing) {
      byKey.set(key, {
        ...existing,
        head: catalogHead,
        hrbp: catalogPerson(row.hrbpEmployeeId, row.hrbpName),
        headcount: Math.max(existing.headcount, row.headcount),
      })
      continue
    }

    byKey.set(key, {
      id: key,
      name,
      head: catalogHead,
      hrbp: catalogPerson(row.hrbpEmployeeId, row.hrbpName),
      headcount: row.headcount,
      teams: [],
      memberIds: [],
    })
  }

  for (const row of teams) {
    const departmentName = row.departmentName.trim()
    const teamName = row.name.trim()
    if (!departmentName || !teamName) continue
    const deptKey = departmentKey(departmentName)
    const existingDept = byKey.get(deptKey) ?? {
      id: deptKey,
      name: departmentName,
      head: null,
      hrbp: null,
      headcount: 0,
      teams: [],
      memberIds: [],
    }
    const id = teamKey(departmentName, teamName)
    const catalogManager = catalogPerson(row.ownerEmployeeId, row.ownerName)
    const existingTeam = existingDept.teams.find((team) => team.id === id)
    const nextTeams = existingTeam
        ? existingDept.teams.map((team) =>
            team.id === id ? { ...team, manager: catalogManager } : team,
          )
      : [
          ...existingDept.teams,
          {
            id,
            name: teamName,
            departmentName: existingDept.name,
            manager: catalogManager,
            headcount: row.headcount,
            memberIds: [],
          },
        ]
    byKey.set(deptKey, {
      ...existingDept,
      teams: sortedTeams(nextTeams),
    })
  }

  const departments = [...byKey.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  return {
    departments,
    teams: sortedTeams(departments.flatMap((department) => department.teams)),
  }
}
