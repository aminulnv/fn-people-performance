import { hasSystemPermission, type SystemPermission } from '@/lib/accessControl/types'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { GradeBandId } from '@/lib/reviews/types'
import { gradeTierDelta } from './indicators'
import type { CalibratorAssignments } from './sessionApi'

/** Appended to the override reason when a 3+ tier change is flagged for HRBP. */
export const HRBP_COSIGN_REASON_TAG = '[Pending HRBP co-sign]'

/** Absolute grade-tier change for an override (null if either grade is missing). */
export function overrideTierSpan(
  from: GradeBandId | null | undefined,
  to: GradeBandId | null | undefined,
): number | null {
  const delta = gradeTierDelta(from ?? null, to ?? null)
  return delta == null ? null : Math.abs(delta)
}

/** HTML rule: changes of 3 or more tiers require HRBP co-sign. */
export function requiresHrbpCosign(
  from: GradeBandId | null | undefined,
  to: GradeBandId | null | undefined,
): boolean {
  const span = overrideTierSpan(from, to)
  return span != null && span >= 3
}

export function reasonWithHrbpCosign(
  reason: string,
  pendingCosign: boolean,
): string {
  const trimmed = reason.trim()
  if (!pendingCosign) return trimmed
  if (trimmed.includes(HRBP_COSIGN_REASON_TAG)) return trimmed
  return `${trimmed} ${HRBP_COSIGN_REASON_TAG}`
}


export function canOverrideCalibrationGrade(input: {
  viewerEmployeeId: number | null
  subject: Pick<
    PlatformEmployee,
    | 'employeeId'
    | 'department'
    | 'team'
    | 'teamId'
    | 'departmentHeadId'
    | 'hrbpId'
  >
  assignments: CalibratorAssignments
  permissions?: readonly SystemPermission[]
}): boolean {
  const viewerId = input.viewerEmployeeId
  if (!viewerId || viewerId === input.subject.employeeId) return false
  if (hasSystemPermission(input.permissions, 'platform.write_all')) return true
  if (
    input.subject.departmentHeadId === viewerId ||
    input.subject.hrbpId === viewerId
  ) {
    return true
  }
  const department = input.subject.department.trim().toLocaleLowerCase()
  const departmentMatch = input.assignments.departments.find(
    (row) => row.department.trim().toLocaleLowerCase() === department,
  )
  if (departmentMatch?.employeeIds.includes(viewerId)) return true

  const teamId = input.subject.teamId
  const teamName = input.subject.team?.trim().toLocaleLowerCase() ?? ''
  const teamMatch = input.assignments.teams.find((row) => {
    if (teamId && row.teamId === teamId) return true
    return (
      teamName.length > 0 &&
      row.team.trim().toLocaleLowerCase() === teamName &&
      row.department.trim().toLocaleLowerCase() === department
    )
  })
  if (teamMatch?.employeeIds.includes(viewerId)) return true

  const personMatch = input.assignments.people.find(
    (row) => row.subjectEmployeeId === input.subject.employeeId,
  )
  return Boolean(personMatch?.employeeIds.includes(viewerId))
}
