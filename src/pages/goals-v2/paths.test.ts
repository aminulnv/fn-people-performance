import { describe, expect, it } from 'vitest'
import {
  goalsV2DetailPath,
  goalsV2GoalPath,
  goalsV2OverviewPath,
} from './paths'

describe('goals-v2 paths', () => {
  it('builds the overview path', () => {
    expect(goalsV2OverviewPath()).toBe('/goals-v2')
  })

  it('builds person and goal detail paths without falling back to /goals', () => {
    expect(goalsV2DetailPath('q2 2026', '42')).toBe(
      '/goals-v2/q2%202026/42',
    )
    expect(goalsV2GoalPath('q2-2026', '42', 'goal/1')).toBe(
      '/goals-v2/q2-2026/42/goal%2F1',
    )
  })
})
