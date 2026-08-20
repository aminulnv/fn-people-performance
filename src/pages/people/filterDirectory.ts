import { isDirectReport } from '@/lib/employees/relationships'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { DirectoryScope } from './directoryHashes'

export type StatusFilter = 'all' | 'active' | 'inactive'

export type DirectoryStats = {
  total: number
  active: number
  inactive: number
  departments: number
  teams: number
}

function uniqueNonEmpty(values: string[]): number {
  return new Set(values.map((value) => value.trim()).filter(Boolean)).size
}

export function directoryStats(
  employees: readonly PlatformEmployee[],
): DirectoryStats {
  let active = 0
  for (const employee of employees) {
    if (employee.isActive) active += 1
  }
  return {
    total: employees.length,
    active,
    inactive: employees.length - active,
    departments: uniqueNonEmpty(employees.map((employee) => employee.department)),
    teams: uniqueNonEmpty(employees.map((employee) => employee.team)),
  }
}

export function employeeSearchHaystack(employee: PlatformEmployee): string {
  return [
    String(employee.employeeId),
    employee.fullName,
    employee.email,
    employee.startDate,
    employee.jobTitle,
    employee.department,
    employee.team,
    employee.division,
    employee.reportsToName,
    employee.departmentHeadName,
    employee.hrbpName,
    employee.jobGrade,
  ]
    .join(' ')
    .toLowerCase()
}

export function compareDirectoryRows(
  left: PlatformEmployee,
  right: PlatformEmployee,
): number {
  const leftDept = left.department.trim()
  const rightDept = right.department.trim()
  const leftBlank = leftDept === ''
  const rightBlank = rightDept === ''
  if (leftBlank !== rightBlank) return leftBlank ? 1 : -1
  const byDept = leftDept.localeCompare(rightDept, undefined, {
    sensitivity: 'base',
  })
  if (byDept !== 0) return byDept
  return left.fullName.localeCompare(right.fullName, undefined, {
    sensitivity: 'base',
  })
}

export function filterDirectory(
  employees: readonly PlatformEmployee[],
  options: {
    query: string
    scope: DirectoryScope
    statusFilter: StatusFilter | null
    me: PlatformEmployee | null
    haystacks?: ReadonlyMap<number, string>
  },
): PlatformEmployee[] {
  const query = options.query.trim().toLowerCase()
  const myDepartment = options.me?.department.trim() ?? ''

  const matched = employees.filter((employee) => {
    if (options.statusFilter === 'active' && !employee.isActive) return false
    if (options.statusFilter === 'inactive' && employee.isActive) return false
    if (options.me && options.scope === 'reports') {
      if (!isDirectReport(employee, options.me)) return false
    }
    if (options.me && options.scope === 'department') {
      if (!myDepartment || employee.department.trim() !== myDepartment) {
        return false
      }
    }
    if (!query) return true
    const haystack =
      options.haystacks?.get(employee.employeeId) ??
      employeeSearchHaystack(employee)
    return haystack.includes(query)
  })

  return matched.sort(compareDirectoryRows)
}
