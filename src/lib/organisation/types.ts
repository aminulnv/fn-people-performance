/** Derived org structure (from People directory for now). */

export type OrgPersonRef = {
  employeeId?: number
  fullName: string
  avatarUrl?: string
}

export type OrgTeam = {
  /** Stable key: department::team (lowercased) */
  id: string
  name: string
  departmentName: string
  /** Team manager (most common reports-to among members). */
  manager: OrgPersonRef | null
  headcount: number
  memberIds: number[]
}

export type OrgDepartment = {
  /** Stable key: department name (lowercased) */
  id: string
  name: string
  head: OrgPersonRef | null
  headcount: number
  teams: OrgTeam[]
  memberIds: number[]
}

export type OrganisationSnapshot = {
  departments: OrgDepartment[]
  teams: OrgTeam[]
}
