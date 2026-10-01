import { useMemo } from 'react'
import {
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import {
  PACKET_STALE_MS,
  queryKeys,
} from '@/lib/queryClient'
import {
  fetchReviewPacket,
  fetchReviewPackets,
  fetchReviewPacketSummaries,
} from '@/lib/reviews/packetsApi'
import type { ReviewPacket } from '@/lib/reviews/types'

/** List/summary caches: show cached data; do not refetch just because the page remounted. */
const listQueryOptions = {
  staleTime: PACKET_STALE_MS,
  refetchOnMount: false as const,
}

/**
 * Per-person full packet: use cached data when fresh; background-refetch only
 * after PACKET_STALE_MS so scorecard opens do not wait on a remount confirm.
 */
const detailQueryOptions = {
  staleTime: PACKET_STALE_MS,
  refetchOnMount: true as const,
}

/** Grades/status only — never write these into the full-packet detail key. */
export function seedReviewPacketSummaries(
  client: QueryClient,
  packets: readonly ReviewPacket[],
): void {
  for (const packet of packets) {
    client.setQueryData(
      queryKeys.reviewPacketSummary(packet.cycleId, packet.employeeId),
      packet,
    )
  }
}

/** Cached summary/full row for instant scorecard paint while the full packet loads. */
export function cachedPacketPlaceholder(
  client: QueryClient,
  cycleId: string,
  employeeId: number,
): ReviewPacket | null {
  if (!cycleId || !Number.isInteger(employeeId) || employeeId <= 0) return null
  return (
    client.getQueryData<ReviewPacket>(
      queryKeys.reviewPacket(cycleId, employeeId),
    ) ??
    client.getQueryData<ReviewPacket>(
      queryKeys.reviewPacketSummary(cycleId, employeeId),
    ) ??
    client
      .getQueryData<ReviewPacket[]>(queryKeys.reviewPacketSummaries(cycleId))
      ?.find((packet) => packet.employeeId === employeeId) ??
    client
      .getQueryData<ReviewPacket[]>(queryKeys.reviewPackets(cycleId))
      ?.find((packet) => packet.employeeId === employeeId) ??
    null
  )
}

export function useReviewPacketSummaries(
  cycleId: string | null | undefined,
  enabled = true,
) {
  const client = useQueryClient()
  const active = Boolean(cycleId) && enabled
  return useQuery({
    queryKey: queryKeys.reviewPacketSummaries(cycleId ?? ''),
    queryFn: async () => {
      const packets = await fetchReviewPacketSummaries(cycleId!)
      seedReviewPacketSummaries(client, packets)
      return packets
    },
    enabled: active,
    ...listQueryOptions,
  })
}

export function useReviewPackets(
  cycleId: string | null | undefined,
  enabled = true,
) {
  const active = Boolean(cycleId) && enabled
  return useQuery({
    queryKey: queryKeys.reviewPackets(cycleId ?? ''),
    queryFn: () => fetchReviewPackets(cycleId!),
    enabled: active,
    ...listQueryOptions,
  })
}

/**
 * Directory / eligibility lists for one or more cycles.
 * Uses grade+status summaries — never the full answers/events payload.
 */
export function useReviewPacketsForCycles(cycleKeys: readonly string[]) {
  const client = useQueryClient()
  const queries = useQueries({
    queries: cycleKeys.map((cycleId) => ({
      queryKey: queryKeys.reviewPacketSummaries(cycleId),
      queryFn: async () => {
        const packets = await fetchReviewPacketSummaries(cycleId)
        seedReviewPacketSummaries(client, packets)
        return packets
      },
      enabled: Boolean(cycleId),
      ...listQueryOptions,
    })),
  })

  const dataStamp = queries
    .map((query) => `${query.dataUpdatedAt}:${query.fetchStatus}:${query.status}`)
    .join('|')

  const packets = useMemo(() => {
    const rows: ReviewPacket[] = []
    for (const query of queries) {
      if (query.data) rows.push(...query.data)
    }
    return rows
    // dataStamp tracks result identity; queries array is unstable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataStamp, cycleKeys.join('\0')])

  const isPending =
    cycleKeys.length > 0 && queries.some((query) => query.isPending && !query.data)
  const isFetching = queries.some((query) => query.isFetching)
  const isError = queries.some((query) => query.isError && !query.data)
  const error = queries.find((query) => query.isError)?.error ?? null

  return { packets, isPending, isFetching, isError, error, queries }
}

export function useReviewPacket(
  cycleId: string | null | undefined,
  employeeId: number | null | undefined,
  enabled = true,
  /** Grades-only summary — paints the drawer while the full packet loads. */
  placeholder?: ReviewPacket | null,
) {
  const active =
    Boolean(cycleId) &&
    typeof employeeId === 'number' &&
    Number.isInteger(employeeId) &&
    employeeId > 0 &&
    enabled
  return useQuery({
    queryKey: queryKeys.reviewPacket(cycleId ?? '', employeeId ?? 0),
    queryFn: () => fetchReviewPacket(cycleId!, employeeId!),
    enabled: active,
    placeholderData: placeholder ?? undefined,
    ...detailQueryOptions,
  })
}

/** Summaries for several cycles (calibration history / linked quarters). */
export function useReviewPacketSummariesForCycles(
  cycleIds: readonly string[],
) {
  const client = useQueryClient()
  const queries = useQueries({
    queries: cycleIds.map((cycleId) => ({
      queryKey: queryKeys.reviewPacketSummaries(cycleId),
      queryFn: async () => {
        const packets = await fetchReviewPacketSummaries(cycleId)
        seedReviewPacketSummaries(client, packets)
        return packets
      },
      enabled: Boolean(cycleId),
      ...listQueryOptions,
    })),
  })

  const dataStamp = queries
    .map((query) => `${query.dataUpdatedAt}:${query.fetchStatus}:${query.status}`)
    .join('|')
  const idsKey = cycleIds.join('\0')

  const byCycleId = useMemo(() => {
    const map = new Map<string, ReviewPacket[]>()
    cycleIds.forEach((cycleId, index) => {
      const data = queries[index]?.data
      if (data) map.set(cycleId, data)
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataStamp, idsKey])

  const isPending =
    cycleIds.length > 0 &&
    queries.some((query) => query.isPending && !query.data)
  const isError = queries.some((query) => query.isError && !query.data)
  const error = queries.find((query) => query.isError)?.error ?? null

  return { byCycleId, queries, isPending, isError, error }
}

export function patchReviewPacketCaches(
  client: QueryClient,
  packet: ReviewPacket,
): void {
  client.setQueryData<ReviewPacket>(
    queryKeys.reviewPacket(packet.cycleId, packet.employeeId),
    packet,
  )

  const patchList = (key: readonly unknown[]) => {
    client.setQueryData<ReviewPacket[]>(key, (current) => {
      if (!current) return current
      const index = current.findIndex((row) => row.id === packet.id)
      if (index < 0) {
        return current.some((row) => row.employeeId === packet.employeeId)
          ? current.map((row) =>
              row.employeeId === packet.employeeId ? packet : row,
            )
          : [...current, packet]
      }
      return current.map((row, i) => (i === index ? packet : row))
    })
  }

  patchList(queryKeys.reviewPackets(packet.cycleId))
  patchList(queryKeys.reviewPacketSummaries(packet.cycleId))
}

export function seedReviewPacketDetails(
  client: QueryClient,
  packets: readonly ReviewPacket[],
): void {
  for (const packet of packets) {
    client.setQueryData(
      queryKeys.reviewPacket(packet.cycleId, packet.employeeId),
      packet,
    )
  }
}

/**
 * Background-warm full packets for a cycle so employee drawers open instantly.
 * Seeds per-person detail keys from the list response.
 * Prefer {@link prefetchReviewPacket} on hover — bulk full-packet fetch is heavy.
 */
export function prefetchReviewPacketsForCycle(
  client: QueryClient,
  cycleId: string,
): void {
  void client
    .prefetchQuery({
      queryKey: queryKeys.reviewPackets(cycleId),
      queryFn: () => fetchReviewPackets(cycleId),
      staleTime: PACKET_STALE_MS,
    })
    .then(() => {
      const packets = client.getQueryData<ReviewPacket[]>(
        queryKeys.reviewPackets(cycleId),
      )
      if (packets) seedReviewPacketDetails(client, packets)
    })
}

/** Warm one employee's full packet (e.g. rating-table row hover). */
export function prefetchReviewPacket(
  client: QueryClient,
  cycleId: string,
  employeeId: number,
): void {
  if (!cycleId || !Number.isInteger(employeeId) || employeeId <= 0) return
  void client.prefetchQuery({
    queryKey: queryKeys.reviewPacket(cycleId, employeeId),
    queryFn: () => fetchReviewPacket(cycleId, employeeId),
    staleTime: PACKET_STALE_MS,
  })
}

export function usePatchReviewPacketCache() {
  const client = useQueryClient()
  return (packet: ReviewPacket) => patchReviewPacketCaches(client, packet)
}

export function invalidateReviewPacketQueries(
  client: QueryClient,
  cycleId?: string,
): void {
  if (cycleId) {
    void client.invalidateQueries({
      queryKey: queryKeys.reviewPackets(cycleId),
    })
    void client.invalidateQueries({
      queryKey: queryKeys.reviewPacketSummaries(cycleId),
    })
    void client.invalidateQueries({
      queryKey: ['review-packet', cycleId],
    })
    return
  }
  void client.invalidateQueries({ queryKey: ['review-packets'] })
  void client.invalidateQueries({ queryKey: ['review-packet-summaries'] })
  void client.invalidateQueries({ queryKey: ['review-packet'] })
}
