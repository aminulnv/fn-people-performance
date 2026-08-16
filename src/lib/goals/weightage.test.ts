import { describe, expect, it } from 'vitest'
import { blankGoal } from './measurements'
import type { Goal } from './types'
import { canSubmitGoals } from './weightage'

function readyGoal(partial: Partial<Goal> & Pick<Goal, 'description' | 'weight'>): Goal {
  const goal = blankGoal({ withDefaultMetric: true })
  return { ...goal, ...partial }
}

describe('canSubmitGoals', () => {
  it('accepts two complete goals that total 100%', () => {
    const check = canSubmitGoals([
      readyGoal({ description: 'Ship quality', weight: 60 }),
      readyGoal({ description: 'Ship roadmap', weight: 40 }),
    ])
    expect(check.ok).toBe(true)
    expect(check.reasons).toEqual([])
  })

  it('names an incomplete cascaded placeholder so it cannot silently block submit', () => {
    const check = canSubmitGoals([
      readyGoal({ description: 'Ship quality', weight: 60 }),
      readyGoal({ description: 'Ship roadmap', weight: 40 }),
      {
        ...blankGoal({ withDefaultMetric: false }),
        description: 'Untitled Cascading Goal from Ada',
        cascadedFromGoalId: 'mgr-1',
        weight: 0,
      },
    ])
    expect(check.ok).toBe(false)
    expect(check.blockers[0]).toMatchObject({
      goalTitle: 'Untitled Cascading Goal from Ada',
      suffix: ' still needs a measure — or remove it.',
    })
    expect(check.blockers[0]?.goalId).toBeTruthy()
  })
})
