import { describe, expect, it } from 'vitest'
import {
  clampPillarWeight,
  defaultReviewPolicy,
  gradesGoalsSeparately,
  gradesOverall,
  normalizeReviewPolicy,
  remainingPillarWeight,
} from './reviewPolicy'

describe('scorecard grade switches', () => {
  it('turns Goals grade off on quarterly and on for annual, with overall on for both', () => {
    const quarterly = defaultReviewPolicy('quarterly_checkin')
    expect(gradesGoalsSeparately(quarterly)).toBe(false)
    expect(gradesOverall(quarterly)).toBe(true)

    const annual = defaultReviewPolicy('annual_appraisal')
    expect(gradesGoalsSeparately(annual)).toBe(true)
    expect(gradesOverall(annual)).toBe(true)
  })

  it('keeps each switch independent when normalizing older policies', () => {
    const goalsOnly = normalizeReviewPolicy(
      { managerReview: { gradeGoals: true, gradeOverall: false } },
      'quarterly_checkin',
    )
    expect(gradesGoalsSeparately(goalsOnly)).toBe(true)
    expect(gradesOverall(goalsOnly)).toBe(false)

    const legacy = normalizeReviewPolicy({}, 'quarterly_checkin')
    expect(gradesGoalsSeparately(legacy)).toBe(false)
    expect(gradesOverall(legacy)).toBe(true)
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
