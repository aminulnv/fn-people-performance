import { describe, expect, it } from 'vitest'
import { isGoalDraftDirty, validateGoalDraft } from '@/lib/goals/draft'
import type { Goal } from '@/lib/goals/types'

const goal: Goal = {
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

describe('shared draft helpers (V1/V2 contract)', () => {
  it('requires a goal name and 100% measurement weights', () => {
    expect(validateGoalDraft({ ...goal, description: ' ' }).ok).toBe(false)
    expect(
      validateGoalDraft({
        ...goal,
        measurements: [{ ...goal.measurements[0], weight: 40 }],
      }).ok,
    ).toBe(false)
    expect(validateGoalDraft(goal).ok).toBe(true)
  })

  it('treats classification edits as dirty', () => {
    expect(isGoalDraftDirty(goal, { ...goal, goalType: 'output' })).toBe(true)
    expect(isGoalDraftDirty(goal, { ...goal, processType: 'okr' })).toBe(true)
    expect(isGoalDraftDirty(goal, { ...goal, priority: 'high' })).toBe(true)
  })

  it('ignores comment-only dirty state', () => {
    expect(
      isGoalDraftDirty(goal, {
        ...goal,
        comments: [
          {
            id: 'c1',
            authorId: 'a1',
            authorName: 'Ada',
            text: 'hi',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ).toBe(false)
  })
})
