import { hasSystemPermission, type SystemPermission } from '@/lib/accessControl/types'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { CalibratorAssignments } from './sessionApi'

export type EffectiveCalibrator = {
  employeeId: number
  source: 'head' | 'hrbp' | 'department' | 'team' | 'person'
}

export function listEffectiveCalibrators(input: {
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
}): EffectiveCalibrator[] {
  const rows: EffectiveCalibrator[] = []
  const seen = new Set<number>()
  const add = (
    employeeId: number | null | undefined,
    source: EffectiveCalibrator['source'],
  ) => {
    if (employeeId == null || employeeId === input.subject.employeeId) return
    if (seen.has(employeeId)) return
    seen.add(employeeId)
    rows.push({ employeeId, source })
  }

  add(input.subject.departmentHeadId, 'head')
  add(input.subject.hrbpId, 'hrbp')

  const department = input.subject.department.trim().toLocaleLowerCase()
  const departmentMatch = input.assignments.departments.find(
    (row) => row.department.trim().toLocaleLowerCase() === department,
  )
  for (const employeeId of departmentMatch?.employeeIds ?? []) {
    add(employeeId, 'department')
  }

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
  for (const employeeId of teamMatch?.employeeIds ?? []) {
    add(employeeId, 'team')
  }

  const personMatch = input.assignments.people.find(
    (row) => row.subjectEmployeeId === input.subject.employeeId,
  )
  for (const employeeId of personMatch?.employeeIds ?? []) {
    add(employeeId, 'person')
  }

  return rows
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
  return listEffectiveCalibrators(input).some(
    (row) => row.employeeId === viewerId,
  )
}
