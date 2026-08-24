import { isDirectReport } from '@/lib/employees/relationships'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  listActiveDelegatedManagerIds,
  listActiveDelegationForEmployee,
} from './store'

export function delegationActingAs(
  actorId: string,
  subject: { managerId?: string },
  people: Array<{ id: string; managerId?: string }>,
  delegatedManagerIds = listActiveDelegatedManagerIds(actorId),
): { asDirectManager: boolean; asSkipLevel: boolean } {
  const delegated = new Set(delegatedManagerIds.map(String))
  const managerId = subject.managerId != null ? String(subject.managerId) : ''
  const manager = people.find((person) => person.id === managerId)
  const skipLevelId = manager?.managerId != null ? String(manager.managerId) : ''
  return {
    asDirectManager: Boolean(managerId && delegated.has(managerId)),
    asSkipLevel: Boolean(skipLevelId && delegated.has(skipLevelId)),
  }
}

export function effectiveManagerIds(
  actorId: string,
  delegatedManagerIds = listActiveDelegatedManagerIds(actorId),
): Set<string> {
  return new Set([String(actorId), ...delegatedManagerIds.map(String)])
}

export function effectiveReportIds(
  actor: { id: string; reportIds: string[] },
  people: Array<{ id: string; reportIds: string[] }>,
  delegatedManagerIds = listActiveDelegatedManagerIds(actor.id),
): string[] {
  const ids = new Set(actor.reportIds.map(String))
  for (const managerId of delegatedManagerIds) {
    const manager = people.find((person) => person.id === String(managerId))
    for (const reportId of manager?.reportIds ?? []) ids.add(String(reportId))
  }
  return [...ids]
}

export function isDelegatingForEmployee(
  actorId: string,
  subjectId: string,
  delegatedManagerIds = listActiveDelegatedManagerIds(actorId),
): boolean {
  return delegatedManagerIds.map(String).includes(String(subjectId))
}

export function isEffectiveDirectReport(
  employee: PlatformEmployee,
  viewer: PlatformEmployee,
  directory: readonly PlatformEmployee[] = [],
  delegatedManagerIds = listActiveDelegatedManagerIds(String(viewer.employeeId)),
): boolean {
  if (isDirectReport(employee, viewer)) return true
  if (delegatedManagerIds.length === 0) return false
  const delegated = new Set(delegatedManagerIds.map(String))
  if (
    employee.reportsToId != null &&
    delegated.has(String(employee.reportsToId))
  ) {
    return true
  }
  return directory.some(
    (manager) =>
      delegated.has(String(manager.employeeId)) &&
      isDirectReport(employee, manager),
  )
}

export function viewerHasEffectiveReports(
  viewer: PlatformEmployee,
  directory: readonly PlatformEmployee[],
  delegatedManagerIds = listActiveDelegatedManagerIds(String(viewer.employeeId)),
): boolean {
  return directory.some((employee) =>
    isEffectiveDirectReport(employee, viewer, directory, delegatedManagerIds),
  )
}

export function managerLineRecipientIds(
  managerId: string | undefined,
): string[] {
  if (!managerId) return []
  const ids = [String(managerId)]
  const delegation = listActiveDelegationForEmployee(Number(managerId))
  if (delegation) ids.push(String(delegation.delegateEmployeeId))
  return [...new Set(ids)]
}

export function possessiveName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`
}
