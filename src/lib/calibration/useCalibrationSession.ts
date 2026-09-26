import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PACKET_STALE_MS, queryClient, queryKeys } from '@/lib/queryClient'
import {
  EMPTY_CALIBRATOR_ASSIGNMENTS,
  fetchCalibrationSitting,
  fetchCalibratorAssignments,
  type CalibrationSitting,
  type CalibratorAssignments,
} from '@/lib/calibration/sessionApi'

const sessionQueryOptions = {
  staleTime: PACKET_STALE_MS,
  refetchOnMount: true as const,
}

export function useCalibrationSitting(
  cycleId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.calibrationSitting(cycleId ?? ''),
    queryFn: () => fetchCalibrationSitting(cycleId!),
    enabled: Boolean(cycleId) && enabled,
    ...sessionQueryOptions,
  })
}

export function useCalibratorAssignments(enabled = true) {
  return useQuery({
    queryKey: queryKeys.calibratorAssignments,
    queryFn: () =>
      fetchCalibratorAssignments().catch(() => EMPTY_CALIBRATOR_ASSIGNMENTS),
    enabled,
    ...sessionQueryOptions,
  })
}

export function setCalibrationSittingCache(
  cycleId: string,
  sitting: CalibrationSitting,
): void {
  queryClient.setQueryData(queryKeys.calibrationSitting(cycleId), sitting)
}

export function setCalibratorAssignmentsCache(
  assignments: CalibratorAssignments,
): void {
  queryClient.setQueryData(queryKeys.calibratorAssignments, assignments)
}

/** Warm sitting + calibrator caches while the page is opening. */
export function prefetchCalibrationSession(cycleId: string): void {
  void queryClient.prefetchQuery({
    queryKey: queryKeys.calibrationSitting(cycleId),
    queryFn: () => fetchCalibrationSitting(cycleId),
    staleTime: PACKET_STALE_MS,
  })
  void queryClient.prefetchQuery({
    queryKey: queryKeys.calibratorAssignments,
    queryFn: () =>
      fetchCalibratorAssignments().catch(() => EMPTY_CALIBRATOR_ASSIGNMENTS),
    staleTime: PACKET_STALE_MS,
  })
}

export function useSetCalibrationSittingCache() {
  const client = useQueryClient()
  return (sitting: CalibrationSitting) => {
    client.setQueryData(
      queryKeys.calibrationSitting(sitting.cycleId),
      sitting,
    )
  }
}
