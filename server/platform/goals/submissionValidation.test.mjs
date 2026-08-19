import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertGoalSubmission,
  validateGoalSubmission,
} from './submissionValidation.mjs'

const policy = {
  minimumRequired: 2,
  recommendedMinimum: 3,
  recommendedMaximum: 5,
  maximumAllowed: null,
}

function readyGoal(overrides = {}) {
  return {
    description: 'Deliver the agreed outcome',
    weight: 50,
    measurements: [
      {
        kind: 'metric',
        title: 'Completion',
        weight: 100,
      },
    ],
    ...overrides,
  }
}

describe('validateGoalSubmission', () => {
  it('accepts a complete goal submission', () => {
    const errors = validateGoalSubmission(
      [readyGoal(), readyGoal({ description: 'Improve quality' })],
      policy,
    )

    assert.deepEqual(errors, [])
  })

  it('rejects fewer goals than the cycle minimum', () => {
    const errors = validateGoalSubmission(
      [readyGoal({ weight: 100 })],
      policy,
    )

    assert.ok(errors.includes('Add at least 2 goals.'))
  })

  it('rejects goal weights that do not total 100%', () => {
    const errors = validateGoalSubmission(
      [readyGoal({ weight: 40 }), readyGoal({ weight: 40 })],
      policy,
    )

    assert.ok(errors.includes('Goal weights need to add up to 100%.'))
  })

  it('rejects missing required goal fields', () => {
    const errors = validateGoalSubmission(
      [
        readyGoal({ description: '', weight: 50 }),
        readyGoal({ description: '   ', weight: 50 }),
      ],
      policy,
    )

    assert.ok(errors.includes('Untitled goal 1 needs a title.'))
    assert.ok(errors.includes('Untitled goal 2 needs a title.'))
  })

  it('rejects missing measurements and invalid measurement totals', () => {
    const errors = validateGoalSubmission(
      [
        readyGoal({ measurements: [] }),
        readyGoal({
          description: 'Improve quality',
          measurements: [
            { kind: 'metric', title: 'Quality', weight: 80 },
          ],
        }),
      ],
      policy,
    )

    assert.ok(
      errors.includes('Deliver the agreed outcome still needs a measure.'),
    )
    assert.ok(
      errors.includes('Improve quality measures need to add up to 100%.'),
    )
  })

  it('returns a 400 with all submission blockers', () => {
    assert.throws(
      () => assertGoalSubmission([], policy),
      (error) =>
        error.statusCode === 400 &&
        error.message.includes('Add at least 2 goals.') &&
        error.message.includes('Goal weights need to add up to 100%.'),
    )
  })
})
