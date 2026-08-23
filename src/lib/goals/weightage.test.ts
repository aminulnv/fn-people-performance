import { describe, expect, it } from 'vitest'
import { blankGoal } from './measurements'
import type { Goal } from './types'
import {
  allocatedWeightCaption,
  canSubmitGoals,
  distributeGoalWeights,
  goalCountWarning,
} from './weightage'

const POLICY = {
  minimumRequired: 2,
  recommendedMinimum: 3,
  recommendedMaximum: 5,
  maximumAllowed: null,
}

function readyGoal(
  partial: Partial<Goal> & Pick<Goal, 'description' | 'weight'>,
): Goal {
  const goal = blankGoal()
  return {
    ...goal,
    measurements: [
      {
        id: `${goal.id}-metric`,
        kind: 'metric',
        title: 'Progress',
        weight: 100,
        unit: 'number',
        direction: 'increase',
        startValue: 0,
        targetValue: 100,
        currentValue: 0,
      },
    ],
    ...partial,
  }
}

describe('allocatedWeightCaption', () => {
  it('pairs allocated weight with what is still left', () => {
    expect(allocatedWeightCaption(75)).toBe('75% allocated · 25% left')
  })

  it('drops the leftover when the set is full', () => {
    expect(allocatedWeightCaption(100)).toBe('100% allocated')
  })

  it('pairs allocated weight with how far the set is over', () => {
    expect(allocatedWeightCaption(110)).toBe('110% allocated · 10% over')
  })
})

describe('distributeGoalWeights', () => {
  it('splits 100% evenly and parks leftover points on the last goals', () => {
    expect(distributeGoalWeights([{ weight: 40 }, { weight: 35 }])).toEqual([
      { weight: 50 },
      { weight: 50 },
    ])
    expect(
      distributeGoalWeights([{ weight: 40 }, { weight: 35 }, { weight: 0 }]),
    ).toEqual([{ weight: 33 }, { weight: 33 }, { weight: 34 }])
    expect(distributeGoalWeights([{ weight: 40 }])).toEqual([{ weight: 100 }])
    expect(distributeGoalWeights([])).toEqual([])
  })
})

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
          description: '',
          cascadedFromGoalId: 'mgr-1',
          linkedGoalLabel: 'Ada’s quality goal',
          weight: 0,
        },
      ],
      POLICY,
    )
    expect(check.ok).toBe(false)
    expect(check.blockers[0]).toMatchObject({
      goalTitle: 'Ada’s quality goal',
      suffix: ' needs a title.',
    })
    expect(check.blockers[0]?.goalId).toBeTruthy()
  })

  it('lists every broken goal instead of stopping at the first', () => {
    const check = canSubmitGoals(
      [
        readyGoal({ description: ' ', weight: 50 }),
        readyGoal({ description: ' ', weight: 50 }),
      ],
      POLICY,
    )
    expect(check.blockers).toHaveLength(2)
    expect(check.blockers.map((blocker) => blocker.suffix)).toEqual([
      ' needs a title.',
      ' needs a title.',
    ])
  })
})
