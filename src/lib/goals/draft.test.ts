import { describe, expect, it } from 'vitest'
import {
  hasPromptableUnsavedGoalDraft,
  isBlankGoalDraft,
  isGoalDraftDirty,
  mergePersistedGoals,
  progressOnlyGoals,
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

  it('ignores progress logs when deciding if a draft is dirty', () => {
    const metric = goal.measurements[0]
    if (metric.kind !== 'metric') throw new Error('expected metric')
    expect(
      isGoalDraftDirty(goal, {
        ...goal,
        measurements: [{ ...metric, currentValue: 40 }],
      }),
    ).toBe(false)
    expect(
      hasPromptableUnsavedGoalDraft(
        [{ ...goal, measurements: [{ ...metric, currentValue: 40 }] }],
        [goal],
      ),
    ).toBe(false)
  })

  it('copies logged progress onto persisted goals without taking title edits', () => {
    const metric = goal.measurements[0]
    if (metric.kind !== 'metric') throw new Error('expected metric')
    const local: Goal = {
      ...goal,
      description: 'Ship reviews now',
      measurements: [
        {
          ...metric,
          currentValue: 40,
          progressLog: [
            {
              id: 'plog-1',
              recordedAt: '2026-08-25T04:00:00.000Z',
              authorName: 'Ada',
              from: 10,
              to: 40,
            },
          ],
        },
      ],
    }

    const progressGoals = progressOnlyGoals([goal], [local])
    expect(progressGoals?.[0]).toMatchObject({
      description: 'Ship reviews',
      measurements: [{ id: 'm1', currentValue: 40 }],
    })
    expect(progressGoals?.[0]?.measurements[0]).toMatchObject({
      progressLog: [{ id: 'plog-1', to: 40 }],
    })
    expect(progressOnlyGoals([goal], [goal])).toBeNull()
  })

  it('persists a proof URL as progress without taking title edits', () => {
    const metric = goal.measurements[0]
    if (metric.kind !== 'metric') throw new Error('expected metric')
    const local: Goal = {
      ...goal,
      description: 'Ship reviews now',
      measurements: [{ ...metric, proofUrl: 'https://dash.fn/coverage' }],
    }

    const progressGoals = progressOnlyGoals([goal], [local])
    expect(progressGoals?.[0]).toMatchObject({
      description: 'Ship reviews',
      measurements: [{ id: 'm1', proofUrl: 'https://dash.fn/coverage' }],
    })
    expect(
      isGoalDraftDirty(goal, {
        ...goal,
        measurements: [{ ...metric, proofUrl: 'https://dash.fn/coverage' }],
      }),
    ).toBe(false)
    expect(
      hasPromptableUnsavedGoalDraft(
        [{ ...goal, measurements: [{ ...metric, proofUrl: 'https://dash.fn/coverage' }] }],
        [goal],
      ),
    ).toBe(false)
  })

  it('keeps an in-flight proof URL across a persist refresh', () => {
    const metric = goal.measurements[0]
    if (metric.kind !== 'metric') throw new Error('expected metric')
    const merged = mergePersistedGoals(
      [{ ...goal, measurements: [{ ...metric, proofUrl: 'https://dash.fn/coverage' }] }],
      [goal],
    )[0]
    expect(merged?.measurements[0]).toMatchObject({
      proofUrl: 'https://dash.fn/coverage',
    })
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

  it('does not prompt for blank weights on a blank new goal', () => {
    const existing = { ...goal, weight: 100 }
    const blank = {
      id: 'new',
      description: '',
      weight: 0,
      measurements: [],
    }
    expect(
      hasPromptableUnsavedGoalDraft(
        [existing, blank],
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
