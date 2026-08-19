import { describe, expect, it } from 'vitest'
import { isGoalDraftDirty, mergePersistedGoals, validateGoalDraft } from '@/lib/goals/draft'
import type { Goal } from '@/lib/goals/types'

const goal: Goal = {
  id: 'g1',
  description: 'Ship reviews',
  weight: 50,
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

  it('treats description edits as dirty', () => {
    expect(
      isGoalDraftDirty(goal, { ...goal, details: 'Updated details' }),
    ).toBe(true)
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

  it('detects milestone measure title edits', () => {
    const base: Goal = {
      ...goal,
      measurements: [
        {
          id: 't1',
          kind: 'milestone',
          measureGroupId: 'measure-1',
          title: 'Task 1',
          weight: 100,
          complete: false,
        },
      ],
    }
    expect(
      isGoalDraftDirty(base, {
        ...base,
        measurements: [
          {
            ...base.measurements[0],
            measureTitle: 'ABCD',
          },
        ],
      }),
    ).toBe(true)
  })

  it('keeps locally added checklist rows when the server snapshot is older', () => {
    const persisted: Goal = {
      ...goal,
      measurements: [
        {
          id: 't1',
          kind: 'milestone',
          listId: 'list-1',
          measureGroupId: 'measure-1',
          listTitle: 'Snacks',
          title: 'Chips',
          weight: 100,
          complete: false,
        },
      ],
    }
    const local: Goal = {
      ...persisted,
      measurements: [
        ...persisted.measurements,
        {
          id: 't2',
          kind: 'milestone',
          listId: 'list-1',
          measureGroupId: 'measure-1',
          listTitle: 'Snacks',
          title: '',
          weight: 0,
          complete: false,
        },
      ],
    }

    const merged = mergePersistedGoals([local], [persisted])[0]
    expect(merged?.measurements).toHaveLength(2)
    expect(merged?.measurements[1]).toMatchObject({ id: 't2', title: '' })
  })
})
