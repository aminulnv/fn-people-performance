import type { OrgTeam } from '@/lib/organisation/types'
import { getEmployee, listEmployees } from './store'
import type { PlatformEmployee, PlatformTeam } from './types'

function managerMatches(
  employee: PlatformEmployee,
  manager: PlatformEmployee,
): boolean {
  if (employee.employeeId === manager.employeeId) return false
  if (employee.reportsToId != null) {
    return employee.reportsToId === manager.employeeId
  }
  const managerEmail = manager.email.trim().toLocaleLowerCase()
  const reportsToEmail = employee.managerEmail.trim().toLocaleLowerCase()
  if (reportsToEmail && managerEmail) {
    return reportsToEmail === managerEmail
  }
  const managerName = manager.fullName.trim().toLocaleLowerCase()
  return (
    Boolean(managerName) &&
    employee.reportsToName.trim().toLocaleLowerCase() === managerName
  )
}

export function isDirectReport(
  employee: PlatformEmployee,
  manager: PlatformEmployee,
): boolean {
  return managerMatches(employee, manager)
}

export function listDirectReports(
  manager: PlatformEmployee | null,
): PlatformEmployee[] {
  if (!manager) return []
  return listEmployees()
    .filter((employee) => managerMatches(employee, manager))
    .sort((left, right) =>
      left.fullName.localeCompare(right.fullName, undefined, {
        sensitivity: 'base',
      }),
    )
}

export function countDirectReports(manager: PlatformEmployee | null): number {
  return listDirectReports(manager).length
}

/** Enough of a person to link from profile fields before the directory lands. */
export function relatedPersonStub(
  employeeId: number | undefined,
  fullName: string,
  email = '',
): PlatformEmployee | null {
  if (employeeId == null || employeeId <= 0) return null
  return {
    employeeId,
    fullName: fullName.trim(),
    email,
    startDate: '',
    jobTitle: '',
    department: '',
    team: '',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: '',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

export function resolveDepartmentHead(
  employee: PlatformEmployee | null,
): PlatformEmployee | null {
  if (!employee) return null
  if (employee.departmentHeadId != null) {
    const match = getEmployee(employee.departmentHeadId)
    if (match) return match
  }
  const headName = employee.departmentHeadName.trim().toLocaleLowerCase()
  if (headName) {
    const match = listEmployees().find(
      (candidate) =>
        candidate.fullName.trim().toLocaleLowerCase() === headName,
    )
    if (match) return match
  }
  return relatedPersonStub(
    employee.departmentHeadId,
    employee.departmentHeadName,
  )
}

export function resolveHrbp(
  employee: PlatformEmployee | null,
): PlatformEmployee | null {
  if (!employee) return null
  if (employee.hrbpId != null) {
    const match = getEmployee(employee.hrbpId)
    if (match) return match
  }
  const hrbpName = employee.hrbpName.trim().toLocaleLowerCase()
  if (hrbpName) {
    const match = listEmployees().find(
      (candidate) =>
        candidate.fullName.trim().toLocaleLowerCase() === hrbpName,
    )
    if (match) return match
  }
  return relatedPersonStub(employee.hrbpId, employee.hrbpName)
}

export type TeamOwnerSources = {
  /** Catalog from `/api/platform/teams` (`owner_employee_id`). */
  teams?: PlatformTeam[]
  /** Derived org teams; `manager` is what Organisation shows as Owner. */
  orgTeams?: OrgTeam[]
}

function sameLabel(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase()
}

function personByIdOrName(
  employeeId: number | null | undefined,
  name: string | null | undefined,
): PlatformEmployee | null {
  if (employeeId != null) {
    const match = getEmployee(employeeId)
    if (match) return match
  }
  const ownerName = name?.trim().toLocaleLowerCase() ?? ''
  if (!ownerName) return null
  return (
    listEmployees().find(
      (candidate) =>
        candidate.fullName.trim().toLocaleLowerCase() === ownerName,
    ) ?? null
  )
}

export function findCatalogTeam(
  employee: PlatformEmployee,
  teams: PlatformTeam[],
): PlatformTeam | null {
  if (employee.teamId != null) {
    const byId = teams.find((team) => team.id === employee.teamId)
    if (byId) return byId
  }
  const teamName = employee.team.trim()
  if (!teamName) return null
  const departmentName = employee.department.trim()
  const byDepartmentAndName = teams.find(
    (team) =>
      sameLabel(team.name, teamName) &&
      (!departmentName || sameLabel(team.departmentName, departmentName)),
  )
  if (byDepartmentAndName) return byDepartmentAndName
  const nameMatches = teams.filter((team) => sameLabel(team.name, teamName))
  return nameMatches.length === 1 ? nameMatches[0] : null
}

export function findOrgTeam(
  employee: PlatformEmployee,
  orgTeams: OrgTeam[],
): OrgTeam | null {
  const teamName = employee.team.trim()
  if (!teamName) return null
  const departmentName = employee.department.trim()
  const byDepartmentAndName = orgTeams.find(
    (team) =>
      sameLabel(team.name, teamName) &&
      (!departmentName || sameLabel(team.departmentName, departmentName)),
  )
  if (byDepartmentAndName) return byDepartmentAndName
  const nameMatches = orgTeams.filter((team) => sameLabel(team.name, teamName))
  return nameMatches.length === 1 ? nameMatches[0] : null
}

export function teamOwnerFallbackName(
  employee: PlatformEmployee | null,
  sources: TeamOwnerSources = {},
): string {
  if (!employee) return ''
  const orgTeam = findOrgTeam(employee, sources.orgTeams ?? [])
  const fromOrg = orgTeam?.manager?.fullName.trim() ?? ''
  if (fromOrg) return fromOrg
  const catalog = findCatalogTeam(employee, sources.teams ?? [])
  const fromCatalog = catalog?.ownerName?.trim() ?? ''
  if (fromCatalog) return fromCatalog
  return employee.teamOwnerName?.trim() ?? ''
}

export function resolveTeamOwner(
  employee: PlatformEmployee | null,
  sources: TeamOwnerSources = {},
): PlatformEmployee | null {
  if (!employee) return null
  const orgTeam = findOrgTeam(employee, sources.orgTeams ?? [])
  const fromOrg = personByIdOrName(
    orgTeam?.manager?.employeeId,
    orgTeam?.manager?.fullName,
  )
  if (fromOrg) return fromOrg

  const catalog = findCatalogTeam(employee, sources.teams ?? [])
  const fromCatalog = personByIdOrName(
    catalog?.ownerEmployeeId,
    catalog?.ownerName,
  )
  if (fromCatalog) return fromCatalog

  return (
    personByIdOrName(employee.teamOwnerId, employee.teamOwnerName) ??
    relatedPersonStub(employee.teamOwnerId, employee.teamOwnerName ?? '')
  )
}
