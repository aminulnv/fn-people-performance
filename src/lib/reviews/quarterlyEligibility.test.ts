import { describe, expect, it } from 'vitest'
import {
  quarterlyDay25Date,
  quarterlyEligibilityForEmployee,
} from './quarterlyEligibility'

describe('quarterly eligibility', () => {
  const q3 = {
    periodKey: 'q3-2026',
    startDate: '2026-07-01',
    type: 'regular' as const,
  }

  it('treats day 25 of the quarter as the first ineligible join date', () => {
    expect(quarterlyDay25Date(q3)).toBe('2026-07-25')
  })

  it('does not apply outside quarterly check-in cycles', () => {
    expect(
      quarterlyEligibilityForEmployee({
        cycle: {
          periodKey: 'annual-2026',
          startDate: '2027-01-01',
          type: 'annual',
        },
        startDate: '2026-11-15',
      }),
    ).toBeNull()
  })

  it('allows joiners through day 24', () => {
    expect(
      quarterlyEligibilityForEmployee({
        cycle: q3,
        startDate: '2026-07-24',
      })?.eligible,
    ).toBe(true)
  })

  it('blocks joiners on day 25 or later', () => {
    expect(
      quarterlyEligibilityForEmployee({
        cycle: q3,
        startDate: '2026-07-25',
      }),
    ).toMatchObject({
      eligible: false,
      reason: 'joined_on_or_after_day_25',
      message:
        'Joined on or after 25 Jul 2026 (day 25), so they’re not eligible for this quarter.',
    })
    expect(
      quarterlyEligibilityForEmployee({
        cycle: q3,
        startDate: '2026-08-01',
      })?.eligible,
    ).toBe(false)
  })
})
