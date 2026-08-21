import { normalizeCycleSettings } from './demoData'
import type {
  CycleGroup,
  CyclePolicyResolution,
  ReviewCycle,
} from './types'

export function cycleGroupsOf(cycle: Pick<ReviewCycle, 'groups'>): CycleGroup[] {
  return cycle.groups ?? []
}

export function findCycleGroupForPerson(
  cycle: Pick<ReviewCycle, 'groups'>,
  employeeId: number,
): CycleGroup | null {
  if (!Number.isInteger(employeeId)) return null
  return (
    cycleGroupsOf(cycle).find((group) =>
      group.memberIds.includes(employeeId),
    ) ?? null
  )
}

/** Group settings if the person is listed; otherwise they are not in this cycle. */
export function resolveCyclePolicyForPerson(
  cycle: ReviewCycle,
  employeeId?: number | null,
): CyclePolicyResolution {
  const group =
    employeeId == null ? null : findCycleGroupForPerson(cycle, employeeId)
  if (!group) {
    return {
      settings: normalizeCycleSettings(cycle.settings),
      stagesConfig: cycle.stagesConfig,
      calibration: cycle.calibration,
      groupId: null,
    }
  }
  return {
    settings: normalizeCycleSettings(group.settings),
    stagesConfig: group.stagesConfig,
    calibration: group.calibration,
    groupId: group.id,
  }
}

/** Move these people onto `keepGroupId`, removing them from every other group. */
export function assignMembersExclusively(
  groups: CycleGroup[],
  keepGroupId: string,
  memberIds: number[],
): CycleGroup[] {
  const unique = [
    ...new Set(memberIds.map(Number).filter(Number.isInteger)),
  ]
  const claimed = new Set(unique)
  return groups.map((group) => {
    if (group.id === keepGroupId) {
      return { ...group, memberIds: unique }
    }
    return {
      ...group,
      memberIds: group.memberIds.filter((id) => !claimed.has(id)),
    }
  })
}

/** Starting template for a new group — not a live default for ungrouped people. */
export function cloneCycleSettingsIntoGroup(
  cycle: ReviewCycle,
  input: { id: string; name: string; memberIds?: number[] },
): CycleGroup {
  return {
    id: input.id,
    cycleId: cycle.id,
    name: input.name.trim() || 'Untitled group',
    memberIds: [...new Set((input.memberIds ?? []).map(Number).filter(Number.isInteger))],
    settings: structuredClone(normalizeCycleSettings(cycle.settings)),
    stagesConfig: structuredClone(cycle.stagesConfig),
    calibration: structuredClone(cycle.calibration),
    createdAt: new Date().toISOString(),
    version: 1,
  }
}

export function employeeIdsForScope(
  employees: Array<{
    employeeId: number
    isActive: boolean
    departmentId?: number
    teamId?: number
    department: string
    team: string
  }>,
  scope:
    | { type: 'people'; employeeIds: number[] }
    | { type: 'department'; departmentId?: number; departmentName?: string }
    | { type: 'team'; teamId?: number; teamName?: string },
): number[] {
  const active = employees.filter((employee) => employee.isActive)
  if (scope.type === 'people') {
    return [...new Set(scope.employeeIds.map(Number).filter(Number.isInteger))]
  }
  if (scope.type === 'department') {
    return active
      .filter(
        (employee) =>
          employee.departmentId === scope.departmentId ||
          employee.department === scope.departmentName,
      )
      .map((employee) => employee.employeeId)
  }
  return active
    .filter(
      (employee) =>
        employee.teamId === scope.teamId || employee.team === scope.teamName,
    )
    .map((employee) => employee.employeeId)
}

export function groupDiffersFromCycle(
  cycle: ReviewCycle,
  group: CycleGroup,
): boolean {
  return (
    JSON.stringify(normalizeCycleSettings(cycle.settings)) !==
      JSON.stringify(normalizeCycleSettings(group.settings)) ||
    JSON.stringify(cycle.stagesConfig) !== JSON.stringify(group.stagesConfig) ||
    JSON.stringify(cycle.calibration) !== JSON.stringify(group.calibration)
  )
}
