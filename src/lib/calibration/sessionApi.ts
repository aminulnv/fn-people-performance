import { apiFetch } from '@/lib/apiClient'

export const CALIBRATION_SITTING_STATUSES = [
  'not_reviewed',
  'discussed',
  'confirmed',
] as const

export type CalibrationSittingStatus =
  (typeof CALIBRATION_SITTING_STATUSES)[number]

export type CalibrationSittingEmployee = {
  employeeId: number
  status: CalibrationSittingStatus
  notes: string
  adjustedAt: string | null
}

export type CalibrationSitting = {
  cycleId: string
  cleanConfirmedAt: string | null
  lockedAt: string | null
  employees: CalibrationSittingEmployee[]
}

export type DepartmentCalibratorAssignment = {
  departmentId: number
  department: string
  headEmployeeId: number | null
  hrbpEmployeeId: number | null
  employeeIds: number[]
}

export type TeamCalibratorAssignment = {
  teamId: number
  team: string
  department: string
  employeeIds: number[]
}

export type PersonCalibratorAssignment = {
  subjectEmployeeId: number
  employeeIds: number[]
}

export type CalibratorAssignments = {
  departments: DepartmentCalibratorAssignment[]
  teams: TeamCalibratorAssignment[]
  people: PersonCalibratorAssignment[]
}

export const EMPTY_CALIBRATOR_ASSIGNMENTS: CalibratorAssignments = {
  departments: [],
  teams: [],
  people: [],
}

export function fetchCalibrationSitting(
  cycleId: string,
): Promise<CalibrationSitting> {
  return apiFetch<CalibrationSitting>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/calibration-sitting`,
  )
}

export function saveCalibrationSittingEmployee(
  cycleId: string,
  employeeId: number,
  patch: {
    status?: CalibrationSittingStatus
    notes?: string
    adjusted?: boolean
  },
): Promise<CalibrationSitting> {
  return apiFetch<CalibrationSitting>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/calibration-sitting/employees/${employeeId}`,
    { method: 'PATCH', body: patch },
  )
}

export function confirmCalibrationClean(
  cycleId: string,
): Promise<CalibrationSitting> {
  return apiFetch<CalibrationSitting>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/calibration-sitting/confirm-clean`,
    { method: 'POST', body: {} },
  )
}

export function lockCalibrationSession(
  cycleId: string,
): Promise<CalibrationSitting> {
  return apiFetch<CalibrationSitting>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/calibration-sitting/lock`,
    { method: 'POST', body: {} },
  )
}

export function fetchCalibratorAssignments(): Promise<CalibratorAssignments> {
  return apiFetch<Partial<CalibratorAssignments>>(
    '/api/platform/department-calibrators',
  ).then((response) => ({
    departments: response.departments ?? [],
    teams: response.teams ?? [],
    people: response.people ?? [],
  }))
}

export function saveDepartmentCalibrators(
  departmentId: number,
  employeeIds: number[],
): Promise<DepartmentCalibratorAssignment | null> {
  return apiFetch<{ department: DepartmentCalibratorAssignment | null }>(
    `/api/platform/departments/${departmentId}/calibrators`,
    { method: 'PUT', body: { employeeIds } },
  ).then((response) => response.department)
}

export function saveTeamCalibrators(
  teamId: number,
  employeeIds: number[],
): Promise<TeamCalibratorAssignment | null> {
  return apiFetch<{ team: TeamCalibratorAssignment | null }>(
    `/api/platform/teams/${teamId}/calibrators`,
    { method: 'PUT', body: { employeeIds } },
  ).then((response) => response.team)
}

export function savePersonCalibrators(
  subjectEmployeeId: number,
  employeeIds: number[],
): Promise<PersonCalibratorAssignment | null> {
  return apiFetch<{ person: PersonCalibratorAssignment | null }>(
    `/api/platform/employees/${subjectEmployeeId}/calibrators`,
    { method: 'PUT', body: { employeeIds } },
  ).then((response) => response.person)
}
