import { getEmployee, listEmployees } from './store'
import type { PlatformEmployee } from './types'

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

export function resolveDepartmentHead(
  employee: PlatformEmployee | null,
): PlatformEmployee | null {
  if (!employee) return null
  if (employee.departmentHeadId != null) {
    const match = getEmployee(employee.departmentHeadId)
    if (match) return match
  }
  const headName = employee.departmentHeadName.trim().toLocaleLowerCase()
  if (!headName) return null
  return (
    listEmployees().find(
      (candidate) =>
        candidate.fullName.trim().toLocaleLowerCase() === headName,
    ) ?? null
  )
}
