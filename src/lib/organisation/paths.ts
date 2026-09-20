import type { PlatformEmployee } from '@/lib/employees/types'
import { departmentKey } from '@/lib/organisation/fromEmployees'

/** URL helpers for organisation unit detail pages. */

export type OrganisationTabId = 'departments' | 'teams' | 'roles'

const ORGANISATION_TAB_ROOTS = new Set([
  '/organisation/departments',
  '/organisation/teams',
  '/organisation/roles',
])

export function organisationTabPath(
  tab: OrganisationTabId = 'departments',
): string {
  return `/organisation/${tab}`
}

/** True on the Organisation tab list roots only — not detail/create subpages. */
export function isOrganisationTabRoot(pathname: string): boolean {
  return (
    ORGANISATION_TAB_ROOTS.has(pathname) ||
    pathname === '/organisation/roles/new'
  )
}

export function departmentDetailPath(departmentId: string): string {
  return `/organisation/departments/${encodeURIComponent(departmentId)}`
}

export function teamDetailPath(teamId: string): string {
  return `/organisation/teams/${encodeURIComponent(teamId)}`
}

export function teamCreatePath(): string {
  return '/organisation/teams/new'
}

export function teamEditPath(teamId: string): string {
  return `/organisation/teams/${encodeURIComponent(teamId)}/edit`
}

export function departmentEditPath(departmentId: string): string {
  return `/organisation/departments/${encodeURIComponent(departmentId)}/edit`
}

export function roleDetailPath(roleId: string, tab?: string): string {
  const base = `/organisation/roles/${encodeURIComponent(roleId)}`
  if (!tab || tab === 'preview') return base
  return `${base}?tab=${encodeURIComponent(tab)}`
}

export function roleCreatePath(): string {
  return '/organisation/roles/new'
}

export function roleEditPath(roleId: string): string {
  return `/organisation/roles/${encodeURIComponent(roleId)}/edit`
}

export function teamKey(departmentName: string, teamName: string): string {
  return `${departmentKey(departmentName)}::${teamName.trim().toLowerCase() || 'unassigned'}`
}

export function departmentPathForName(departmentName: string): string | null {
  const trimmed = departmentName.trim()
  if (!trimmed) return null
  return departmentDetailPath(departmentKey(trimmed))
}

export function teamPathForNames(
  departmentName: string,
  teamName: string,
): string | null {
  const team = teamName.trim()
  if (!team) return null
  return teamDetailPath(teamKey(departmentName, team))
}

export function orgChartPath(personId?: number | null): string {
  if (personId == null || !Number.isInteger(personId) || personId <= 0) {
    return '/organisation/chart'
  }
  return `/organisation/chart?person=${personId}`
}

/** Best organisation detail page for a directory person. */
export function organisationPathForEmployee(
  employee: Pick<PlatformEmployee, 'department' | 'team'>,
): string {
  const department = employee.department.trim()
  const team = employee.team.trim()
  if (department && team) {
    return teamDetailPath(teamKey(department, team))
  }
  if (department) {
    return departmentDetailPath(departmentKey(department))
  }
  return organisationTabPath('departments')
}
