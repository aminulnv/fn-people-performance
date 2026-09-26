import { useQuery } from '@tanstack/react-query'
import { PACKET_STALE_MS, queryKeys } from '@/lib/queryClient'
import { fetchCycleGoalSubmissionsRemote } from '@/lib/goals/remoteApi'

export function useCycleGoalSubmissions(
  cycleId: string | null | undefined,
  enabled = true,
) {
  const active = Boolean(cycleId) && enabled
  return useQuery({
    queryKey: queryKeys.cycleGoalSubmissions(cycleId ?? ''),
    queryFn: async () => {
      try {
        return await fetchCycleGoalSubmissionsRemote(cycleId!)
      } catch {
        throw new Error('Could not load goals')
      }
    },
    enabled: active,
    staleTime: PACKET_STALE_MS,
    refetchOnMount: true,
  })
}
