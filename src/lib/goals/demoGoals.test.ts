import { describe, expect, it } from 'vitest'
import { DEFAULT_CYCLE_SETTINGS } from '@/lib/reviews/demoData'
import { buildDemoGoals } from './demoGoals'
import { canSubmitGoals, sumMeasurementWeights } from './weightage'

describe('buildDemoGoals', () => {
  const goals = buildDemoGoals('2026-q1', 'p1')

  it('splits measurement weight across metrics and todos', () => {
    const mixed = goals.find((goal) =>
      goal.measurements.some((item) => item.kind === 'milestone'),
    )

    expect(mixed).toBeDefined()
    expect(mixed!.measurements.map((item) => item.weight)).toEqual([50, 25, 25])
    expect(mixed!.measurements.every((item) => item.weight > 0)).toBe(true)
  })

  it('keeps every goal’s measurements at 100%', () => {
    for (const goal of goals) {
      expect(sumMeasurementWeights(goal.measurements)).toBe(100)
    }
  })

  it('can be submitted under the default cycle policy', () => {
    expect(canSubmitGoals(goals, DEFAULT_CYCLE_SETTINGS.goalCountPolicy).ok).toBe(
      true,
    )
  })
})
