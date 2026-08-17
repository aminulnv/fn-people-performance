import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchActivity } from '@/lib/activity/api'
import type { ActivityListFilters } from '@/lib/activity/types'
import { queryKeys } from '@/lib/queryClient'

export function useActivityFeed(filters: ActivityListFilters) {
  const queryFilters = useMemo(
    () => ({ ...filters, cursor: undefined, limit: filters.limit ?? 50 }),
    [filters],
  )
  const query = useInfiniteQuery({
    queryKey: queryKeys.activity(queryFilters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchActivity({ ...queryFilters, cursor: pageParam }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  return {
    ...query,
    events: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}
