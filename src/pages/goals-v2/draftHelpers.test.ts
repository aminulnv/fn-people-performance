import { describe, expect, it } from 'vitest'
import { isGoalDraftDirty, validateGoalDraft } from './draftHelpers'
import type { Goal } from '@/lib/goals/types'

const baseGoal: Goal = {
  id: 'g1',
  description: 'Ship reviews',
  weight: 50,
  goalType: 'outcome',
  processType: 'bau',
  priority: 'medium',
  measurements: [
    {
      id: 'm1',
      kind: 'metric',
      title: 'Coverage',
      weight: 100,
      unit: '%',
      direction: 'increase',
      startValue: 0,
      targetValue: 80,
      currentValue: 10,
    },
  ],
}

describe('validateGoalDraft', () => {
  it('requires a goal name', () => {
    expect(validateGoalDraft({ ...baseGoal, description: '  ' })).toEqual({
      ok: false,
      nameError: 'Goal name is required',
      classificationError: undefined,
      measurementWeightError: undefined,
    })
  })

  it('requires measurement weights to total 100%', () => {
    const goal: Goal = {
      ...baseGoal,
      measurements: [
        { ...baseGoal.measurements[0], weight: 40 },
      ],
    }
    expect(validateGoalDraft(goal)).toEqual({
      ok: false,
      nameError: undefined,
      classificationError: undefined,
      measurementWeightError: 'Measurement weights must total 100%',
    })
  })

  it('accepts a complete draft', () => {
    expect(validateGoalDraft(baseGoal)).toEqual({
      ok: true,
      nameError: undefined,
      classificationError: undefined,
      measurementWeightError: undefined,
    })
  })
})

describe('isGoalDraftDirty', () => {
  it('ignores comment and timestamp-only changes', () => {
    const next: Goal = {
      ...baseGoal,
      updatedAt: '2026-08-15T00:00:00.000Z',
      comments: [
        {
          id: 'c1',
          authorName: 'Ada',
          text: 'Looks good',
          createdAt: '2026-08-15T00:00:00.000Z',
        },
      ],
    }
    expect(isGoalDraftDirty(baseGoal, next)).toBe(false)
  })

  it('detects editable field changes', () => {
    expect(
      isGoalDraftDirty(baseGoal, { ...baseGoal, description: 'Ship goals' }),
    ).toBe(true)
  })
})
