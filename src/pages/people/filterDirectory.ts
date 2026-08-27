import { isEffectiveDirectReport } from '@/lib/delegations/roles'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { DirectoryScope } from './directoryHashes'

export type StatusFilter = 'all' | 'active' | 'inactive'

export type DirectoryAttributeId =
  | 'name'
  | 'email'
  | 'jobTitle'
  | 'department'
  | 'team'
  | 'reportsTo'

export type DirectoryAttributeFilters = Partial<
  Record<DirectoryAttributeId, string[]>
>

export type DirectoryAttributeOption = {
  id: DirectoryAttributeId | 'status'
  label: string
}

export type DirectoryAttributeValue = {
  value: string
  label: string
}

/** People-directory fields shown in the Filters popover, in display order. */
export const DIRECTORY_ATTRIBUTES: DirectoryAttributeOption[] = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'status', label: 'Status' },
  { id: 'jobTitle', label: 'Job title' },
  { id: 'department', label: 'Department' },
  { id: 'team', label: 'Team' },
  { id: 'reportsTo', label: 'Reports to' },
]

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

export function employeeAttributeValue(
  employee: PlatformEmployee,
  attribute: DirectoryAttributeId,
): string {
  switch (attribute) {
    case 'name':
      return employee.fullName.trim()
    case 'email':
      return employee.email.trim()
    case 'jobTitle':
      return employee.jobTitle.trim()
    case 'department':
      return employee.department.trim()
    case 'team':
      return employee.team.trim()
    case 'reportsTo':
      return employee.reportsToName.trim()
  }
}

export function directoryAttributeValues(
  employees: readonly PlatformEmployee[],
  attribute: DirectoryAttributeId,
): DirectoryAttributeValue[] {
  const seen = new Set<string>()
  let hasEmpty = false
  for (const employee of employees) {
    const value = employeeAttributeValue(employee, attribute)
    if (!value) {
      hasEmpty = true
      continue
    }
    seen.add(value)
  }
  const values = [...seen]
    .sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    )
    .map((value) => ({ value, label: value }))
  if (hasEmpty) values.push({ value: '', label: 'None' })
  return values
}

export function statusAttributeValues(): DirectoryAttributeValue[] {
  return [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]
}

export function selectedStatusValues(
  statusFilter: StatusFilter | null,
): string[] {
  if (statusFilter === 'active') return ['active']
  if (statusFilter === 'inactive') return ['inactive']
  if (statusFilter === 'all') return ['active', 'inactive']
  return []
}

export function statusFilterFromValues(
  values: readonly string[],
): StatusFilter | null {
  const hasActive = values.includes('active')
  const hasInactive = values.includes('inactive')
  if (hasActive && hasInactive) return 'all'
  if (hasActive) return 'active'
  if (hasInactive) return 'inactive'
  return null
}

export function toggleAttributeValue(
  filters: DirectoryAttributeFilters,
  attribute: DirectoryAttributeId,
  value: string,
): DirectoryAttributeFilters {
  const current = filters[attribute] ?? []
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value]
  if (next.length === 0) {
    const { [attribute]: _removed, ...rest } = filters
    return rest
  }
  return { ...filters, [attribute]: next }
}

export function selectedAttributeCount(
  filters: DirectoryAttributeFilters,
): number {
  return Object.values(filters).reduce(
    (sum, values) => sum + (values?.length ?? 0),
    0,
  )
}

/** Counts filters that actually narrow the directory (not the “all” highlight). */
export function activeDirectoryFilterCount(
  statusFilter: StatusFilter | null,
  attributeFilters: DirectoryAttributeFilters,
): number {
  const statusCount =
    statusFilter === 'active' || statusFilter === 'inactive' ? 1 : 0
  return statusCount + selectedAttributeCount(attributeFilters)
}

export function filterDirectory(
  employees: readonly PlatformEmployee[],
  options: {
    query: string
    scope: DirectoryScope
    statusFilter: StatusFilter | null
    me: PlatformEmployee | null
    haystacks?: ReadonlyMap<number, string>
    attributeFilters?: DirectoryAttributeFilters
  },
): PlatformEmployee[] {
  const query = options.query.trim().toLowerCase()
  const myDepartment = options.me?.department.trim() ?? ''
  const attributeFilters = options.attributeFilters

  const matched = employees.filter((employee) => {
    if (options.statusFilter === 'active' && !employee.isActive) return false
    if (options.statusFilter === 'inactive' && employee.isActive) return false
    if (attributeFilters) {
      for (const attribute of DIRECTORY_ATTRIBUTES) {
        if (attribute.id === 'status') continue
        const selected = attributeFilters[attribute.id]
        if (!selected?.length) continue
        const value = employeeAttributeValue(employee, attribute.id)
        if (!selected.includes(value)) return false
      }
    }
    if (options.me && options.scope === 'reports') {
      if (!isEffectiveDirectReport(employee, options.me, employees)) {
        return false
      }
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
