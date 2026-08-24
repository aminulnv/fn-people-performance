import { describe, expect, it } from 'vitest'
import {
  hasPromptableUnsavedGoalDraft,
  isBlankGoalDraft,
  isGoalDraftDirty,
  mergePersistedGoals,
  validateGoalDraft,
} from '@/lib/goals/draft'
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

  it('keeps in-flight title, details, and weight across a persist refresh', () => {
    const merged = mergePersistedGoals(
      [{ ...goal, description: 'Ship reviews now', details: 'Local', weight: 70 }],
      [goal],
    )[0]
    expect(merged).toMatchObject({
      description: 'Ship reviews now',
      details: 'Local',
      weight: 70,
    })
  })

  it('treats an empty new goal as a blank draft', () => {
    expect(
      isBlankGoalDraft({
        id: 'new',
        description: '',
        weight: 0,
        measurements: [],
      }),
    ).toBe(true)
    expect(
      isBlankGoalDraft({
        id: 'new',
        description: '',
        weight: 100,
        measurements: [],
      }),
    ).toBe(true)
    expect(isBlankGoalDraft({ ...goal, description: '' })).toBe(false)
  })

  it('does not prompt when the only local goal is a blank create draft', () => {
    const blank: Goal = {
      id: 'new',
      description: '',
      weight: 0,
      measurements: [],
    }
    expect(hasPromptableUnsavedGoalDraft([blank], [])).toBe(false)
    expect(
      hasPromptableUnsavedGoalDraft([{ ...blank, description: 'Ship it' }], []),
    ).toBe(true)
  })

  it('does not prompt for auto-filled weights on a blank new goal', () => {
    const existing = { ...goal, weight: 100 }
    const blank = {
      id: 'new',
      description: '',
      weight: 50,
      measurements: [],
    }
    expect(
      hasPromptableUnsavedGoalDraft(
        [{ ...existing, weight: 50 }, blank],
        [existing],
      ),
    ).toBe(false)
  })

  it('prompts when weights were customized away from an even split', () => {
    const existing = { ...goal, weight: 100 }
    const blank = {
      id: 'new',
      description: '',
      weight: 30,
      measurements: [],
    }
    expect(
      hasPromptableUnsavedGoalDraft(
        [{ ...existing, weight: 70 }, blank],
        [existing],
      ),
    ).toBe(true)
  })

  it('prompts when an existing goal has unsaved edits', () => {
    expect(
      hasPromptableUnsavedGoalDraft(
        [{ ...goal, details: 'Changed' }],
        [goal],
      ),
    ).toBe(true)
    expect(hasPromptableUnsavedGoalDraft([goal], [goal])).toBe(false)
  })
})
