import { describe, expect, it } from 'vitest'
import { defaultReviewPolicy } from './reviewPolicy'
import { describeScorecardSubmitBlock } from './submitValidation'
import { updateScorecardFeedback } from './scorecardTemplates'

function answers(body: string) {
  return { 'quarter-comment': body }
}

describe('describeScorecardSubmitBlock', () => {
  it('requires a Goals grade on a Q1–Q3 manager check-in', () => {
    const policy = defaultReviewPolicy('quarterly_checkin', 'q3-2026')
    expect(
      describeScorecardSubmitBlock({
        policy,
        actorRole: 'manager',
        answersById: answers('Solid quarter.'),
      }),
    ).toBe('Select a Goals grade before submitting.')
    expect(
      describeScorecardSubmitBlock({
        policy,
        actorRole: 'manager',
        goalsGrade: 'performing',
        answersById: answers('Solid quarter.'),
      }),
    ).toBeNull()
  })

  it('does not require Goals or overall on Q4', () => {
    const policy = defaultReviewPolicy('quarterly_checkin', 'q4-2026')
    expect(
      describeScorecardSubmitBlock({
        policy,
        actorRole: 'manager',
        answersById: { 'q4-progress': '' },
      }),
    ).toBeNull()
  })

  it('skips optional questions and optional feedback', () => {
    const policy = defaultReviewPolicy('annual_appraisal', 'annual-2026')
    expect(
      describeScorecardSubmitBlock({
        policy,
        actorRole: 'self',
        goalsGrade: 'performing',
        overallGrade: 'performing',
        skillIds: ['skill-admin-support'],
        skillGrades: { 'skill-admin-support': 'intermediate' },
        valueIds: ['move-fast'],
        valueGrades: { 'move-fast': 'exceeding' },
        answersById: {
          delivered: 'Shipped the plan.',
          values: 'Held the bar.',
          improve: '',
          support: '',
        },
        strengths: '',
        developments: '',
      }),
    ).toBeNull()
  })

  it('requires every skill and core value on annual', () => {
    const policy = defaultReviewPolicy('annual_appraisal', 'annual-2026')
    const base = {
      policy,
      actorRole: 'self' as const,
      goalsGrade: 'performing',
      overallGrade: 'performing',
      skillIds: ['skill-admin-support', 'skill-coaching'],
      valueIds: ['move-fast'],
      answersById: {
        delivered: 'Shipped the plan.',
        values: 'Held the bar.',
      },
    }
    expect(
      describeScorecardSubmitBlock({
        ...base,
        skillGrades: { 'skill-admin-support': 'intermediate' },
        valueGrades: { 'move-fast': 'performing' },
      }),
    ).toBe('Grade every skill before submitting.')
    expect(
      describeScorecardSubmitBlock({
        ...base,
        skillGrades: {
          'skill-admin-support': 'intermediate',
          'skill-coaching': 'advanced',
        },
        valueGrades: {},
      }),
    ).toBe('Grade every core value before submitting.')
  })

  it('requires Q4 Goals on a manager annual with weighted suggest', () => {
    const policy = defaultReviewPolicy('annual_appraisal', 'annual-2026')
    expect(
      describeScorecardSubmitBlock({
        policy,
        actorRole: 'manager',
        useWeightedSuggest: true,
        overallGrade: 'performing',
        skillIds: [],
        valueIds: [],
        answersById: {
          delivered: 'Reliable owner.',
          values: 'Models the standard.',
          retain: 'yes',
          engaged: 'yes',
        },
      }),
    ).toBe('Select a Q4 Goals grade before submitting.')
  })

  it('requires packed feedback when that setting is on', () => {
    const policy = updateScorecardFeedback(
      defaultReviewPolicy('quarterly_checkin', 'q3-2026'),
      { enabled: true, required: true },
    )
    expect(
      describeScorecardSubmitBlock({
        policy,
        actorRole: 'manager',
        goalsGrade: 'performing',
        answersById: answers('Solid quarter.'),
        strengths: 'Owns delivery.',
        developments: '',
      }),
    ).toBe('Fill in Strengths and Areas Of Improvement before submitting.')
  })

  it('requires an overall grade on annual when not leave', () => {
    const policy = defaultReviewPolicy('annual_appraisal', 'annual-2026')
    expect(
      describeScorecardSubmitBlock({
        policy,
        actorRole: 'self',
        goalsGrade: 'performing',
        skillIds: [],
        valueIds: [],
        answersById: {
          delivered: 'Shipped the plan.',
          values: 'Held the bar.',
        },
      }),
    ).toBe('Select an overall grade before submitting.')
    expect(
      describeScorecardSubmitBlock({
        policy,
        actorRole: 'self',
        leave: true,
        skillIds: [],
        valueIds: [],
        answersById: {
          delivered: 'Shipped the plan.',
          values: 'Held the bar.',
        },
      }),
    ).toBeNull()
  })
})
