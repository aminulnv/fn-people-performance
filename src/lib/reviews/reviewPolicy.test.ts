import { describe, expect, it } from 'vitest'
import {
  defaultReviewPolicy,
  gradesGoalsSeparately,
  gradesOverall,
  normalizeReviewPolicy,
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
})
