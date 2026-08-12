/** URL helpers for organisation unit detail pages. */

export function departmentDetailPath(departmentId: string): string {
  return `/organisation/departments/${encodeURIComponent(departmentId)}`
}

export function teamDetailPath(teamId: string): string {
  return `/organisation/teams/${encodeURIComponent(teamId)}`
}
