import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryClient'
import type { ReviewPacket } from '@/lib/reviews/types'
import {
  invalidateReviewPacketQueries,
  patchReviewPacketCaches,
} from '@/lib/reviews/useReviewPackets'

function packet(partial: Partial<ReviewPacket> = {}): ReviewPacket {
  return {
    id: 'pkt-1',
    cycleId: 'q3-2026',
    groupId: 'group-1',
    employeeId: 2,
    managerEmployeeId: 1,
    status: 'manager_in_progress',
    selfOverallGrade: null,
    managerOverallGrade: 'performing',
    calibratedOverallGrade: null,
    publishedOverallGrade: null,
    managerOverrideReason: '',
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: [],
    version: 1,
    ...partial,
  }
}

describe('review packet query cache', () => {
  it('patches list and detail entries for the same packet', () => {
    const client = new QueryClient()
    const original = packet()
    client.setQueryData(queryKeys.reviewPackets(original.cycleId), [original])
    client.setQueryData(
      queryKeys.reviewPacketSummaries(original.cycleId),
      [original],
    )

    const next = packet({ managerOverallGrade: 'exceeding', version: 2 })
    patchReviewPacketCaches(client, next)

    expect(
      client.getQueryData<ReviewPacket[]>(
        queryKeys.reviewPackets(original.cycleId),
      ),
    ).toEqual([next])
    expect(
      client.getQueryData<ReviewPacket[]>(
        queryKeys.reviewPacketSummaries(original.cycleId),
      ),
    ).toEqual([next])
    expect(
      client.getQueryData<ReviewPacket>(
        queryKeys.reviewPacket(original.cycleId, original.employeeId),
      ),
    ).toEqual(next)
  })

  it('invalidates packet queries for one cycle', async () => {
    const client = new QueryClient()
    let hits = 0
    await client.fetchQuery({
      queryKey: queryKeys.reviewPackets('q3-2026'),
      queryFn: async () => {
        hits += 1
        return [packet()]
      },
    })
    invalidateReviewPacketQueries(client, 'q3-2026')
    await client.refetchQueries({ queryKey: queryKeys.reviewPackets('q3-2026') })
    expect(hits).toBe(2)
  })
})
