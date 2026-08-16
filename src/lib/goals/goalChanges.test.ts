import { describe, expect, it } from 'vitest'
import type { Goal } from './types'
import { hasStructuralGoalChanges } from './goalChanges'

const goal: Goal = {
  id: 'goal-1',
  description: 'Improve delivery quality',
  details: 'Close critical defects faster',
  goalType: 'outcome',
  processType: 'bau',
  priority: 'medium',
  weight: 100,
  ownerId: 'person-1',
  linkedGoalLabel: 'Company reliability',
  progressStatus: 'on_track',
  comments: [],
  updatedAt: '2026-08-01T00:00:00.000Z',
  measurements: [
    {
      id: 'todo-1',
      kind: 'milestone',
      title: 'Triage incoming defects',
      weight: 50,
      complete: false,
    },
    {
      id: 'metric-1',
      kind: 'metric',
      title: 'Defects closed',
      weight: 50,
      unit: 'number',
      direction: 'increase',
      startValue: 0,
      currentValue: 10,
      targetValue: 80,
    },
  ],
}

function withGoal(change: (draft: Goal) => void): Goal[] {
  const draft = structuredClone(goal)
  change(draft)
  return [draft]
}

describe('hasStructuralGoalChanges', () => {
  it('allows progress, status, comments, and timestamps without reapproval', () => {
    const next = withGoal((draft) => {
      const todo = draft.measurements[0]
      const metric = draft.measurements[1]
      if (todo.kind === 'milestone') todo.complete = true
      if (metric.kind === 'metric') metric.currentValue = 40
      draft.progressStatus = 'at_risk'
      draft.comments = [
        {
          id: 'comment-1',
          authorName: 'Aminul',
          text: 'Progress update',
          createdAt: '2026-08-16T00:00:00.000Z',
        },
      ]
      draft.updatedAt = '2026-08-16T00:00:00.000Z'
    })

    expect(hasStructuralGoalChanges([goal], next)).toBe(false)
  })

  it.each([
    ['title', (draft: Goal) => void (draft.description = 'New title')],
    ['description', (draft: Goal) => void (draft.details = 'New details')],
    ['goal weight', (draft: Goal) => void (draft.weight = 75)],
    ['goal type', (draft: Goal) => void (draft.goalType = 'output')],
    ['process type', (draft: Goal) => void (draft.processType = 'okr')],
    ['priority', (draft: Goal) => void (draft.priority = 'high')],
    ['owner', (draft: Goal) => void (draft.ownerId = 'person-2')],
    ['cascading goal label', (draft: Goal) => void (draft.linkedGoalLabel = 'New link')],
    [
      'cascading goal id',
      (draft: Goal) => void (draft.cascadedFromGoalId = 'manager-goal-2'),
    ],
    [
      'to-do wording',
      (draft: Goal) => void (draft.measurements[0].title = 'New wording'),
    ],
    [
      'metric target',
      (draft: Goal) => {
        const metric = draft.measurements[1]
        if (metric.kind === 'metric') metric.targetValue = 100
      },
    ],
    [
      'measurement weight',
      (draft: Goal) => void (draft.measurements[0].weight = 60),
    ],
  ])('requires reapproval for a changed %s', (_label, change) => {
    expect(hasStructuralGoalChanges([goal], withGoal(change))).toBe(true)
  })

  it('requires reapproval when goals or measurements are added or removed', () => {
    expect(hasStructuralGoalChanges([goal], [])).toBe(true)
    expect(
      hasStructuralGoalChanges(
        [goal],
        withGoal((draft) => {
          draft.measurements.pop()
        }),
      ),
    ).toBe(true)
  })
})
