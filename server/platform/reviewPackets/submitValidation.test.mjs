import test from 'node:test'
import assert from 'node:assert/strict'
import { describeScorecardSubmitBlock } from './submitValidation.mjs'

const quarterly = {
  managerReview: { gradeGoals: true, gradeOverall: false },
  scorecard: {
    pillars: [{ id: 'goals', enabled: true, label: 'Goals' }],
    questions: [
      {
        id: 'quarter-comment',
        enabled: true,
        required: true,
        kind: 'open_ended',
        visibility: ['manager'],
      },
    ],
    feedback: { enabled: false, required: false, visibility: [] },
  },
}

test('requires a Goals grade on a quarterly manager review', () => {
  assert.equal(
    describeScorecardSubmitBlock({
      policy: quarterly,
      actorRole: 'manager',
      answers: [{ questionId: 'quarter-comment', body: 'Solid quarter.' }],
    }),
    'Select a Goals grade before submitting.',
  )
  assert.equal(
    describeScorecardSubmitBlock({
      policy: quarterly,
      actorRole: 'manager',
      pillarScores: [{ pillarId: 'goals', grade: 'performing' }],
      answers: [{ questionId: 'quarter-comment', body: 'Solid quarter.' }],
    }),
    null,
  )
})

test('requires each skill and value on an annual form', () => {
  const annual = {
    managerReview: { gradeGoals: true, gradeOverall: true },
    scorecard: {
      pillars: [
        { id: 'goals', enabled: true, label: 'Goals' },
        { id: 'skills', enabled: true, label: 'Skills' },
        { id: 'values', enabled: true, label: 'Core Values' },
      ],
      questions: [
        {
          id: 'delivered',
          enabled: true,
          required: true,
          kind: 'open_ended',
          visibility: ['employee'],
        },
      ],
      feedback: { enabled: false, required: false, visibility: ['employee'] },
    },
  }
  assert.equal(
    describeScorecardSubmitBlock({
      policy: annual,
      actorRole: 'self',
      overallGrade: 'performing',
      pillarScores: [{ pillarId: 'goals', grade: 'performing' }],
      skillIds: ['skill-admin-support'],
      valueIds: ['move-fast'],
      answers: [{ questionId: 'delivered', body: 'Shipped it.' }],
    }),
    'Grade every skill before submitting.',
  )
})
