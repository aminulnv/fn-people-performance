/** People Performance org directory person (local UI model for now). */
export type PlatformEmployee = {
  /** Numeric HR employee id (e.g. 101, 914) */
  employeeId: number
  fullName: string
  email: string
  /** ISO date YYYY-MM-DD */
  startDate: string
  jobTitle: string
  department: string
  /** Team within the department (sheet column formerly called Wing). */
  team: string
  division: string
  reportsToName: string
  departmentHeadName: string
  hrbpName: string
  jobGrade: string
  site: string
  /** External image URL; empty when unset (initials fallback in UI). */
  avatarUrl: string
  managerEmail: string
  reportsToId?: number
  departmentHeadId?: number
  hrbpId?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateEmployeeInput = {
  employeeId: number
  fullName: string
  email: string
  startDate: string
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
  Omit<CreateEmployeeInput, 'isActive'>

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
