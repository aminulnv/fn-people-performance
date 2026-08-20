import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GoalsSnapshot } from '@/lib/goals/types'

const mockFetchGoalsSnapshot = vi.fn<() => Promise<GoalsSnapshot>>()
const mockWatchGoalsSnapshot = vi.fn<(onChange: () => void) => () => void>()
const mockResolveHomeBanners = vi.fn()
const mockUseCurrentPerson = vi.fn()

vi.mock('@/lib/goalsApi', () => ({
  fetchGoalsSnapshot: () => mockFetchGoalsSnapshot(),
  watchGoalsSnapshot: (onChange: () => void) => mockWatchGoalsSnapshot(onChange),
}))

vi.mock('@/lib/useCurrentPerson', () => ({
  useCurrentPerson: () => mockUseCurrentPerson(),
}))

vi.mock('./homeBanner', () => ({
  resolveHomeBanners: (...args: unknown[]) => mockResolveHomeBanners(...args),
}))

import { resetSharedGoalsSnapshotForTests } from '@/lib/goals/useSharedGoalsSnapshot'
import { useHomeBanners } from './useHomeBanners'

function snapshotStub(): GoalsSnapshot {
  return {
    cycle: {
      id: 'q3-2026',
      label: 'Q3 2026',
      day1: '2026-07-01',
      phase: 'window_open',
      goalCountPolicy: {
        minimumRequired: 2,
        recommendedMinimum: 3,
        recommendedMaximum: 5,
        maximumAllowed: null,
      },
      postWindowGoalPolicy: 'two_tier_approval',
      goalWindow: { startDate: '2026-06-06', endDate: '2026-08-30' },
    },
    cycleStatus: 'current',
    availableCycles: [],
    activePersonId: 'm1',
    people: [],
    byPerson: {},
  }
}

describe('useHomeBanners', () => {
  afterEach(() => {
    resetSharedGoalsSnapshotForTests()
    vi.clearAllMocks()
  })

  it('waits for goals hydration before resolving banners', async () => {
    const hydrated = snapshotStub()
    mockUseCurrentPerson.mockReturnValue({ id: 'm1', name: 'Manager' })
    mockFetchGoalsSnapshot.mockResolvedValue(hydrated)
    mockWatchGoalsSnapshot.mockReturnValue(() => {})
    mockResolveHomeBanners.mockReturnValue([{ id: 'set_goals' }])

    const { result } = renderHook(() => useHomeBanners())

    expect(result.current).toEqual([])
    await waitFor(() => {
      expect(result.current).toEqual([{ id: 'set_goals' }])
    })
    expect(mockResolveHomeBanners).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1' }),
      expect.any(Date),
      hydrated,
    )
  })

  it('re-resolves when the goals store notifies after hydration', async () => {
    let storeListener: (() => void) | undefined
    const first = snapshotStub()
    const second = {
      ...snapshotStub(),
      byPerson: {
        m1: {
          personId: 'm1',
          status: 'submitted' as const,
          goals: [{ id: 'g1', description: 'Ship', weight: 100, measurements: [] }],
          version: 2,
        },
      },
    }

    mockUseCurrentPerson.mockReturnValue({ id: 'm1', name: 'Manager' })
    let current = first
    mockFetchGoalsSnapshot.mockImplementation(async () => current)
    mockWatchGoalsSnapshot.mockImplementation((listener) => {
      storeListener = listener
      return () => {}
    })
    mockResolveHomeBanners.mockImplementation(
      (_person: unknown, _date: unknown, snapshot: GoalsSnapshot) =>
        snapshot.byPerson.m1 ? [] : [{ id: 'set_goals' }],
    )

    const { result } = renderHook(() => useHomeBanners())

    await waitFor(() => {
      expect(result.current).toEqual([{ id: 'set_goals' }])
    })

    current = second
    storeListener?.()

    await waitFor(() => {
      expect(result.current).toEqual([])
    })
    expect(mockFetchGoalsSnapshot.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
