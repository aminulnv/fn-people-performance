import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedGoalSave } from './useDebouncedGoalSave'
import type { Goal } from '@/lib/goals/types'

const goal = (weight: number): Goal => ({
  id: 'g1',
  description: 'Ship',
  weight,
  measurements: [],
})

describe('useDebouncedGoalSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('persists only the latest goals after rapid updates', () => {
    const persist = vi.fn()
    const { result } = renderHook(() => useDebouncedGoalSave(persist, 280))

    act(() => {
      result.current.schedule([goal(40)])
      result.current.schedule([goal(45)])
      result.current.schedule([goal(50)])
    })

    expect(persist).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(280)
    })
    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledWith([expect.objectContaining({ weight: 50 })])
  })
})
