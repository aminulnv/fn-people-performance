import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeMilestoneWeightsInGoal,
  redistributeMilestoneListWeightsEvenly,
} from './measurementWeights.mjs'

describe('measurementWeights', () => {
  it('splits a checklist total evenly across items', () => {
    const items = [
      { id: 'a', kind: 'milestone', weight: 34 },
      { id: 'b', kind: 'milestone', weight: 0 },
      { id: 'c', kind: 'milestone', weight: 0 },
    ]
    const next = redistributeMilestoneListWeightsEvenly(items, 34)
    assert.deepEqual(
      next.map((item) => item.weight),
      [11, 11, 12],
    )
  })

  it('normalizes milestone groups in a goal without changing the group total', () => {
    const measurements = [
      {
        id: 'm1',
        kind: 'milestone',
        measureGroupId: 'g1',
        listId: 'l1',
        title: 'Spinach',
        weight: 34,
      },
      {
        id: 'm2',
        kind: 'milestone',
        measureGroupId: 'g1',
        listId: 'l1',
        title: 'Cucumber',
        weight: 0,
      },
      {
        id: 'm3',
        kind: 'milestone',
        measureGroupId: 'g1',
        listId: 'l2',
        listTitle: 'Snacks',
        title: 'Chips',
        weight: 0,
      },
      {
        id: 'metric1',
        kind: 'metric',
        title: 'Revenue',
        weight: 66,
      },
    ]

    const normalized = normalizeMilestoneWeightsInGoal(measurements)
    const milestones = normalized.filter((item) => item.kind === 'milestone')
    assert.equal(
      milestones.reduce((sum, item) => sum + item.weight, 0),
      34,
    )
    assert.deepEqual(
      milestones.map((item) => item.weight),
      [11, 11, 12],
    )
    assert.equal(normalized.find((item) => item.id === 'metric1')?.weight, 66)
  })
})
