import { describe, expect, it } from 'vitest'
import { blankGoal } from './measurements'
import type { Goal } from './types'
import {
  allocatedWeightCaption,
  canSubmitGoals,
  appendGoalWithWeight,
  distributeGoalWeights,
  goalWeightIssue,
  hasUnassignedGoalWeight,
  goalCountWarning,
  isEvenGoalSplit,
  removeGoalKeepingWeights,
  submitBlockersForGoal,
  isMeasureGoalIssue,
  measureIssueLabel,
  submitHoverHints,
  submitIssueForGoal,
  submitSetBlockers,
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

describe('appendGoalWithWeight', () => {
  it('fills the first goal at 100%', () => {
    expect(appendGoalWithWeight([], { weight: 0 })).toEqual([{ weight: 100 }])
  })

  it('re-splits an even set when another goal is added', () => {
    expect(
      appendGoalWithWeight([{ weight: 100 }], { weight: 0 }),
    ).toEqual([{ weight: 50 }, { weight: 50 }])
    expect(
      appendGoalWithWeight([{ weight: 50 }, { weight: 50 }], { weight: 0 }),
    ).toEqual([{ weight: 33 }, { weight: 33 }, { weight: 34 }])
  })

  it('leaves a manual split alone and gives the new goal the leftover', () => {
    expect(
      appendGoalWithWeight([{ weight: 70 }, { weight: 30 }], { weight: 0 }),
    ).toEqual([{ weight: 70 }, { weight: 30 }, { weight: 0 }])
    expect(
      appendGoalWithWeight([{ weight: 60 }, { weight: 20 }], { weight: 0 }),
    ).toEqual([{ weight: 60 }, { weight: 20 }, { weight: 20 }])
  })
})

describe('removeGoalKeepingWeights', () => {
  it('re-splits an even set when a goal is removed', () => {
    expect(
      removeGoalKeepingWeights(
        [
          { id: 'a', weight: 50 },
          { id: 'b', weight: 50 },
        ],
        'b',
      ),
    ).toEqual([{ id: 'a', weight: 100 }])
  })

  it('keeps a manual split after a goal is removed', () => {
    expect(
      removeGoalKeepingWeights(
        [
          { id: 'a', weight: 70 },
          { id: 'b', weight: 30 },
        ],
        'b',
      ),
    ).toEqual([{ id: 'a', weight: 70 }])
  })
})

describe('isEvenGoalSplit', () => {
  it('treats unset weights as still automatic', () => {
    expect(isEvenGoalSplit([])).toBe(true)
    expect(isEvenGoalSplit([{ weight: 0 }, { weight: 0 }])).toBe(true)
    expect(isEvenGoalSplit([{ weight: 100 }])).toBe(true)
    expect(isEvenGoalSplit([{ weight: 70 }, { weight: 30 }])).toBe(false)
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
    expect(check.reasons).toContain('Every goal needs a weight.')
    const titleBlocker = check.blockers.find(
      (blocker) => blocker.suffix === ' needs a title.',
    )
    expect(titleBlocker).toMatchObject({
      goalTitle: 'Ada’s quality goal',
      suffix: ' needs a title.',
    })
    expect(titleBlocker?.goalId).toBeTruthy()
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

  it('returns the named issue for one goal from the submit blockers', () => {
    const check = canSubmitGoals(
      [
        readyGoal({ description: 'Ship quality', weight: 60 }),
        { ...blankGoal({ withDefaultMetric: false }), description: 'test', weight: 40 },
      ],
      POLICY,
    )

    expect(submitIssueForGoal('missing', check.blockers)).toBeUndefined()
    const incomplete = check.blockers.find((blocker) => blocker.goalTitle === 'test')
    expect(incomplete?.reason).toBe('test still needs a metric.')
    expect(submitIssueForGoal(incomplete!.goalId!, check.blockers)).toBe(
      'test still needs a metric.',
    )
    expect(isMeasureGoalIssue('test still needs a metric.')).toBe(true)
    expect(isMeasureGoalIssue('Untitled goal 1 needs a title.')).toBe(false)
    expect(measureIssueLabel('test still needs a metric.')).toBe(
      'Still needs a metric.',
    )
    expect(
      measureIssueLabel(
        'Ada’s quality goal still needs a metric — or remove it.',
      ),
    ).toBe('Still needs a metric — or remove it.')
    expect(measureIssueLabel('test still needs a name on each metric.')).toBe(
      'Still needs a name on each metric.',
    )
    expect(measureIssueLabel('test metrics need to add up to 100%.')).toBe(
      'Metrics need to add up to 100%.',
    )
    expect(submitHoverHints(check.blockers)).toEqual([
      'test: Still needs a metric.',
    ])
  })

  it('names the goal next to the table wording for the submit hover', () => {
    const check = canSubmitGoals(
      [{ ...blankGoal({ withDefaultMetric: false }), description: 'test', weight: 50 }],
      POLICY,
    )
    expect(submitHoverHints(check.blockers)).toEqual([
      'Add at least 2 goals.',
      'Weights need to add up to 100%.',
      'test: Still needs a metric.',
    ])
  })

  it('keeps set-level blockers off a single goal', () => {
    const incomplete = blankGoal({ withDefaultMetric: false })
    incomplete.description = 'test'
    incomplete.weight = 50
    const check = canSubmitGoals([incomplete], POLICY)

    expect(check.blockers.some((blocker) => !blocker.goalId)).toBe(true)
    expect(submitBlockersForGoal(incomplete.id, check.blockers)).toEqual([
      expect.objectContaining({
        goalId: incomplete.id,
        suffix: ' still needs a metric.',
      }),
    ])
    expect(submitSetBlockers(check.blockers).map((blocker) => blocker.reason)).toEqual(
      ['Add at least 2 goals.'],
    )
    expect(submitSetBlockers(check.blockers)[0]?.action).toBe('add_goal')
  })

  it('keeps weight-sum off the set banner because the Weight column already shows it', () => {
    const check = canSubmitGoals(
      [
        readyGoal({ description: 'Quality', weight: 55 }),
        readyGoal({ description: 'Delivery', weight: 20 }),
      ],
      POLICY,
    )

    expect(check.reasons).toContain('Weights need to add up to 100%.')
    expect(submitSetBlockers(check.blockers)).toEqual([])
  })

  it('rejects a 100% total when a goal has no weight', () => {
    const weights = [
      { weight: 40 },
      { weight: 35 },
      { weight: 25 },
      { weight: 0 },
      { weight: 0 },
    ]
    expect(hasUnassignedGoalWeight(weights)).toBe(true)
    expect(goalWeightIssue(weights)).toBe('Every goal needs a weight.')

    const check = canSubmitGoals(
      [
        readyGoal({ description: 'Quality', weight: 40 }),
        readyGoal({ description: 'Delivery', weight: 35 }),
        readyGoal({ description: 'Collaboration', weight: 25 }),
        readyGoal({ description: 'This is a test goal', weight: 0 }),
        readyGoal({ description: 'test', weight: 0 }),
      ],
      POLICY,
    )

    expect(check.ok).toBe(false)
    expect(check.reasons).toEqual(['Every goal needs a weight.'])
    expect(check.reasons).not.toContain('Weights need to add up to 100%.')
  })

  it('does not ask for weights when there are no goals yet', () => {
    const check = canSubmitGoals([], POLICY)

    expect(check.blockers.map((blocker) => blocker.reason)).toEqual([
      'Add at least 2 goals.',
    ])
  })
})
