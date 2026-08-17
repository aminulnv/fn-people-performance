import type { PlatformEmployee } from '@/lib/employees/types'
import { departmentKey } from '@/lib/organisation/fromEmployees'

/** URL helpers for organisation unit detail pages. */

export function departmentDetailPath(departmentId: string): string {
  return `/organisation/departments/${encodeURIComponent(departmentId)}`
}

export function teamDetailPath(teamId: string): string {
  return `/organisation/teams/${encodeURIComponent(teamId)}`
}

function teamKey(departmentName: string, teamName: string): string {
  return `${departmentKey(departmentName)}::${teamName.trim().toLowerCase() || 'unassigned'}`
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
  return '/organisation'
}
