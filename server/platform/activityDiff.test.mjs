import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyGoalUpdate } from './activityDiff.mjs'

const baseGoal = {
  description: 'Grow NPS',
  details: null,
  weight: 20,
  ownerId: '1',
  cascadedFromGoalId: null,
  comments: [],
  measurements: [
    {
      id: 'm1',
      kind: 'metric',
      title: 'NPS',
      weight: 20,
      currentValue: 62,
      targetValue: 70,
      progressLog: [],
    },
  ],
}

describe('classifyGoalUpdate', () => {
  it('uses a generic progress label when the metric name repeats the goal', () => {
    const previous = {
      ...baseGoal,
      description: 'Build Performance Platform Phase 1',
      measurements: [
        {
          id: 'm1',
          kind: 'metric',
          title: 'Build Performance Platform Phase 1',
          currentValue: 20,
          progressLog: [],
        },
      ],
    }
    const result = classifyGoalUpdate(previous, {
      ...previous,
      measurements: [
        {
          ...previous.measurements[0],
          currentValue: 50,
          progressLog: [{ id: 'p1', from: 20, to: 50 }],
        },
      ],
    })
    assert.equal(result.eventKey, 'goal.metric_progress_updated')
    assert.equal(result.summary, 'Updated progress on “Build Performance Platform Phase 1”')
    assert.deepEqual(result.changes, [{ field: 'progress', from: 20, to: 50 }])
  })

  it('emits a progress event when only the metric value changes', () => {
    const next = {
      ...baseGoal,
      measurements: [
        {
          ...baseGoal.measurements[0],
          currentValue: 68,
          progressLog: [{ id: 'p1', from: 62, to: 68 }],
        },
      ],
    }
    const result = classifyGoalUpdate(baseGoal, next)
    assert.equal(result.eventKey, 'goal.metric_progress_updated')
    assert.match(result.summary, /NPS/)
    assert.deepEqual(result.changes, [{ field: 'NPS', from: 62, to: 68 }])
  })

  it('emits a comment event when only a comment is added', () => {
    const result = classifyGoalUpdate(baseGoal, {
      ...baseGoal,
      comments: [{ id: 'c1', text: 'On track for the quarter.' }],
    })
    assert.equal(result.eventKey, 'goal.comment_added')
    assert.equal(result.changes[0].field, 'comment')
    assert.equal(result.changes[0].to, 'On track for the quarter.')
  })

  it('emits a comment updated event when only the text changes', () => {
    const previous = {
      ...baseGoal,
      comments: [{ id: 'c1', text: 'On track for the quarter.' }],
    }
    const result = classifyGoalUpdate(previous, {
      ...previous,
      comments: [{ id: 'c1', text: 'Still on track.' }],
    })
    assert.equal(result.eventKey, 'goal.comment_updated')
    assert.equal(result.changes[0].from, 'On track for the quarter.')
    assert.equal(result.changes[0].to, 'Still on track.')
  })

  it('emits a comment deleted event when a comment is removed', () => {
    const previous = {
      ...baseGoal,
      comments: [{ id: 'c1', text: 'On track for the quarter.' }],
    }
    const result = classifyGoalUpdate(previous, { ...previous, comments: [] })
    assert.equal(result.eventKey, 'goal.comment_deleted')
    assert.equal(result.changes[0].from, 'On track for the quarter.')
  })

  it('emits a milestone completed event', () => {
    const previous = {
      ...baseGoal,
      measurements: [
        {
          id: 't1',
          kind: 'milestone',
          title: 'Ship v2',
          complete: false,
          progressLog: [],
        },
      ],
    }
    const result = classifyGoalUpdate(previous, {
      ...previous,
      measurements: [{ ...previous.measurements[0], complete: true }],
    })
    assert.equal(result.eventKey, 'goal.milestone_completed')
  })

  it('returns field-level rows for a structural edit', () => {
    const result = classifyGoalUpdate(baseGoal, { ...baseGoal, weight: 40 })
    assert.equal(result.eventKey, 'goal.updated')
    assert.deepEqual(result.changes, [{ field: 'weight', from: 20, to: 40 }])
  })

  it('returns null when nothing changed', () => {
    assert.equal(classifyGoalUpdate(baseGoal, structuredClone(baseGoal)), null)
  })
})
