import type { PlatformEmployee } from '@/lib/employees/types'
import type { CalibratorAssignments } from './sessionApi'

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
}): boolean {
  const viewerId = input.viewerEmployeeId
  if (!viewerId || viewerId === input.subject.employeeId) return false
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
