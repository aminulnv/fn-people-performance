import { describe, expect, it } from 'vitest'
import {
  clampPillarWeight,
  defaultReviewPolicy,
  gradesGoalsSeparately,
  gradesOverall,
  lockedGradeTogglesForCycle,
  normalizeReviewPolicy,
  remainingPillarWeight,
} from './reviewPolicy'

describe('scorecard grade switches', () => {
  it('defaults Q1–Q3 to goals on / overall off, Q4 both off, annual both on', () => {
    const q1 = defaultReviewPolicy('quarterly_checkin', 'q1-2026')
    expect(gradesGoalsSeparately(q1)).toBe(true)
    expect(gradesOverall(q1)).toBe(false)

    const q4 = defaultReviewPolicy('quarterly_checkin', 'q4-2026')
    expect(gradesGoalsSeparately(q4)).toBe(false)
    expect(gradesOverall(q4)).toBe(false)

    const annual = defaultReviewPolicy('annual_appraisal', 'annual-2026')
    expect(gradesGoalsSeparately(annual)).toBe(true)
    expect(gradesOverall(annual)).toBe(true)
  })

  it('locks regular quarterly and annual grade toggles to the appraisal model', () => {
    expect(lockedGradeTogglesForCycle('quarterly_checkin', 'q2-2026')).toMatchObject({
      locked: true,
      gradeGoals: true,
      gradeOverall: false,
    })
    expect(lockedGradeTogglesForCycle('quarterly_checkin', 'q4-2026')).toMatchObject({
      locked: true,
      gradeGoals: false,
      gradeOverall: false,
    })
    expect(lockedGradeTogglesForCycle('annual_appraisal', 'annual-2026')).toMatchObject({
      locked: true,
      gradeGoals: true,
      gradeOverall: true,
    })
    expect(lockedGradeTogglesForCycle('custom')).toMatchObject({ locked: false })
  })

  it('forces locked grade toggles when normalizing older policies', () => {
    const forcedOff = normalizeReviewPolicy(
      { managerReview: { gradeGoals: true, gradeOverall: true } },
      'quarterly_checkin',
      'q1-2026',
    )
    expect(gradesGoalsSeparately(forcedOff)).toBe(true)
    expect(gradesOverall(forcedOff)).toBe(false)

    const q4Forced = normalizeReviewPolicy(
      { managerReview: { gradeGoals: true, gradeOverall: true } },
      'quarterly_checkin',
      'q4-2026',
    )
    expect(gradesGoalsSeparately(q4Forced)).toBe(false)
    expect(gradesOverall(q4Forced)).toBe(false)

    const custom = normalizeReviewPolicy(
      { managerReview: { gradeGoals: false, gradeOverall: true } },
      'custom',
    )
    expect(gradesGoalsSeparately(custom)).toBe(false)
    expect(gradesOverall(custom)).toBe(true)
  })

  it('drops sequential visibility, late self-review, release, appeal, and unused grade edits from older policies', () => {
    const policy = normalizeReviewPolicy(
      {
        selfReview: { visibility: 'sequential', latePolicy: 'block' },
        managerReview: {
          goalsScoreEdit: 'read_only',
          finalGradeEdit: 'confirm_only',
        },
        release: { mode: 'batch_ptr', acknowledgement: 'first_view' },
        appeal: { mode: 'record_only', days: 7 },
      } as never,
      'quarterly_checkin',
    )
    expect(policy.selfReview).not.toHaveProperty('visibility')
    expect(policy.selfReview).not.toHaveProperty('latePolicy')
    expect(policy.managerReview).not.toHaveProperty('goalsScoreEdit')
    expect(policy.managerReview).not.toHaveProperty('finalGradeEdit')
    expect(policy).not.toHaveProperty('release')
    expect(policy).not.toHaveProperty('appeal')
  })
})

describe('pillar weight cap', () => {
  it('stops one area taking more than the leftover 100%', () => {
    const policy = defaultReviewPolicy('annual_appraisal')
    expect(remainingPillarWeight(policy, 'goals')).toBe(50)
    expect(clampPillarWeight(policy, 'goals', 80)).toBe(50)
    expect(clampPillarWeight(policy, 'goals', 40)).toBe(40)
  })
})
