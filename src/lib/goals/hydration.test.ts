import { describe, expect, it } from 'vitest'
import {
  getGoalsHydration,
  listHydratedGoalCycleIds,
  markCycleGoalsHydrated,
  markOwnGoalsHydrated,
  resetGoalsHydrationForTests,
  subscribeGoalsHydration,
} from './hydration'

describe('goals hydration marks', () => {
  it('treats an unmarked cycle as not ready', () => {
    resetGoalsHydrationForTests()
    expect(getGoalsHydration('q3-2026')).toEqual({
      ownReady: false,
      cycleReady: false,
    })
  })

  it('lets My Goals paint after the signed-in person lands', () => {
    resetGoalsHydrationForTests()
    markOwnGoalsHydrated('q3-2026')
    expect(getGoalsHydration('q3-2026')).toEqual({
      ownReady: true,
      cycleReady: false,
    })
  })

  it('marks own goals ready when the full cycle lands', () => {
    resetGoalsHydrationForTests()
    let ticks = 0
    const stop = subscribeGoalsHydration(() => {
      ticks += 1
    })
    markCycleGoalsHydrated('q3-2026')
    stop()
    expect(getGoalsHydration('q3-2026')).toEqual({
      ownReady: true,
      cycleReady: true,
    })
    expect(ticks).toBe(1)
    expect(listHydratedGoalCycleIds()).toEqual(['q3-2026'])
  })
})
