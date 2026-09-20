/** People Performance org directory person (local UI model for now). */
export type PlatformEmployee = {
  /** Numeric HR employee id (e.g. 101, 914) */
  employeeId: number
  fullName: string
  email: string
  /** ISO date YYYY-MM-DD */
  startDate: string
  /** Functional role from Revolut specialisation (e.g. QA Engineer). */
  role: string
  /** Catalog role id when the person sits in a job family. */
  roleId?: string
  jobTitle: string
  department: string
  departmentId?: number
  /** Team within the department (sheet column formerly called Wing). */
  team: string
  teamId?: number
  division: string
  reportsToName: string
  departmentHeadName: string
  hrbpName: string
  /** Owner of the employee's team (`teams.owner_employee_id`). */
  teamOwnerName?: string
  jobGrade: string
  /** Date the current job_grade took effect. Absent until a grade-change row exists. */
  gradeEffectiveOn?: string
  /** Latest promotion. Absent until a promotion is recorded. */
  lastPromotionOn?: string
  /** True when an active PIP row is open. */
  onPip?: boolean
  site: string
  /** External image URL; empty when unset (initials fallback in UI). */
  avatarUrl: string
  managerEmail: string
  reportsToId?: number
  departmentHeadId?: number
  hrbpId?: number
  teamOwnerId?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** One-person profile payload - avoids downloading the full directory. */
export type EmployeeProfilePayload = {
  employee: PlatformEmployee
  related: PlatformEmployee[]
  directReports: PlatformEmployee[]
  managerDirectReportCount: number
  directoryCount: number
  nestedReportCounts: Record<number, number>
}

export type CreateEmployeeInput = {
  employeeId: number
  fullName: string
  email: string
  startDate: string
  /** Functional role from Revolut specialisation (e.g. QA Engineer). */
  role?: string
  /** Preferred: catalog role id. `role` stays a display/sync fallback. */
  roleId?: string
  jobTitle: string
  department: string
  team: string
  division: string
  reportsToName: string
  departmentHeadName: string
  hrbpName: string
  jobGrade: string
  site: string
  /** Omit on form saves to leave the stored URL unchanged. */
  avatarUrl?: string
  managerEmail: string
  isActive?: boolean
}

export type UpdateEmployeeInput = Required<
  Pick<CreateEmployeeInput, 'isActive'>
> &
  Omit<CreateEmployeeInput, 'isActive'> & {
    gradeChangeKind?: GradeChangeKind
  }

export type GradeChangeKind = 'promotion' | 'lateral' | 'demotion'

/** Department catalog row from `/api/platform/departments`. */
export type PlatformDepartment = {
  id: number
  name: string
  headEmployeeId: number | null
  headName: string | null
  headEmail: string | null
  hrbpEmployeeId: number | null
  hrbpName: string | null
  hrbpEmail: string | null
  headcount: number
  teamCount: number
}

export type CreateDepartmentInput = {
  name: string
  headEmployeeId?: number | null
  hrbpEmployeeId?: number | null
}

export type UpdateDepartmentInput = CreateDepartmentInput & {
  id: number
}

export type CreateTeamInput = {
  name: string
  departmentId: number
  ownerEmployeeId?: number | null
}

export type UpdateTeamInput = CreateTeamInput & {
  id: number
}

/** Team catalog row from `/api/platform/teams`. */
export type PlatformTeam = {
  id: number
  name: string
  departmentId: number
  departmentName: string
  ownerEmployeeId: number | null
  ownerName: string | null
  ownerEmail: string | null
  headcount: number
}
