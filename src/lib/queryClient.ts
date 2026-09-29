import { QueryClient } from '@tanstack/react-query'

/** How long packet / cycle payloads stay "fresh" before a background refetch. */
export const PACKET_STALE_MS = 5 * 60_000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export const queryKeys = {
  notifications: (recipientId: string) =>
    ['notifications', recipientId] as const,
  employeeOkrs: (employeeId: number, quarter?: string) =>
    ['employee-okrs', employeeId, quarter ?? 'all'] as const,
  goals: ['goals'] as const,
  activity: (filters: Record<string, unknown>) =>
    ['activity', filters] as const,
  reviewPackets: (cycleId: string) => ['review-packets', cycleId] as const,
  reviewPacketSummaries: (cycleId: string) =>
    ['review-packet-summaries', cycleId] as const,
  reviewPacket: (cycleId: string, employeeId: number) =>
    ['review-packet', cycleId, employeeId] as const,
  reviewPacketSummary: (cycleId: string, employeeId: number) =>
    ['review-packet-summary', cycleId, employeeId] as const,
  cycleGoalSubmissions: (cycleId: string) =>
    ['cycle-goal-submissions', cycleId] as const,
  calibrationSitting: (cycleId: string) =>
    ['calibration-sitting', cycleId] as const,
  calibratorAssignments: ['calibrator-assignments'] as const,
}
