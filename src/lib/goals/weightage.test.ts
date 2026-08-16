import { describe, expect, it } from 'vitest'
import { blankGoal } from './measurements'
import type { Goal } from './types'
import { canSubmitGoals, goalCountWarning } from './weightage'

const POLICY = {
  minimumRequired: 2,
  recommendedMinimum: 3,
  recommendedMaximum: 5,
  maximumAllowed: null,
}

function readyGoal(
  partial: Partial<Goal> & Pick<Goal, 'description' | 'weight'>,
): Goal {
  const goal = blankGoal({ withDefaultMetric: true })
  return { ...goal, ...partial }
}

describe('canSubmitGoals', () => {
  it('accepts two complete goals that total 100%', () => {
    const check = canSubmitGoals(
      [
        readyGoal({ description: 'Ship quality', weight: 60 }),
        readyGoal({ description: 'Ship roadmap', weight: 40 }),
      ],
      POLICY,
    )
    expect(check.ok).toBe(true)
    expect(check.reasons).toEqual([])
  })

  it('warns but allows submission with two goals', () => {
    const check = canSubmitGoals(
      [
        readyGoal({ description: 'Ship quality', weight: 60 }),
        readyGoal({ description: 'Ship roadmap', weight: 40 }),
      ],
      POLICY,
    )

    expect(check.ok).toBe(true)
    expect(check.warning).toContain('recommends 3 to 5 goals')
  })

  it('warns above five goals and not within the recommended range', () => {
    expect(goalCountWarning(6, POLICY)).toContain('recommends keeping')
    expect(goalCountWarning(3, POLICY)).toBeNull()
    expect(goalCountWarning(5, POLICY)).toBeNull()
  })

  it('uses a cycle-specific hard range', () => {
    const customPolicy = {
      minimumRequired: 1,
      recommendedMinimum: 2,
      recommendedMaximum: 7,
      maximumAllowed: 7,
    }
    const oneGoal = [readyGoal({ description: 'Single focus', weight: 100 })]
    const tooMany = Array.from({ length: 8 }, (_, index) =>
      readyGoal({
        description: `Goal ${index + 1}`,
        weight: index === 0 ? 100 : 0,
      }),
    )

    expect(canSubmitGoals(oneGoal, customPolicy).ok).toBe(true)
    expect(canSubmitGoals(oneGoal, customPolicy).warning).toContain(
      'recommends 2 to 7 goals',
    )
    expect(canSubmitGoals(tooMany, customPolicy).reasons).toContain(
      'This cycle allows no more than 7 goals.',
    )
  })

  it('names an incomplete cascaded placeholder so it cannot silently block submit', () => {
    const check = canSubmitGoals(
      [
        readyGoal({ description: 'Ship quality', weight: 60 }),
        readyGoal({ description: 'Ship roadmap', weight: 40 }),
        {
          ...blankGoal({ withDefaultMetric: false }),
          description: 'Untitled Cascading Goal from Ada',
          cascadedFromGoalId: 'mgr-1',
          weight: 0,
        },
      ],
      POLICY,
    )
    expect(check.ok).toBe(false)
    expect(check.blockers[0]).toMatchObject({
      goalTitle: 'Untitled Cascading Goal from Ada',
      suffix: ' still needs a measure — or remove it.',
    })
    expect(check.blockers[0]?.goalId).toBeTruthy()
  })
})
