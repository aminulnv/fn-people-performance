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
  employees: CalibrationSittingEmployee[]
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
