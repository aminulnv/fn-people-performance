import { describe, expect, it } from 'vitest'
import {
  annualEligibilityForEmployee,
  annualJoinCutoffDate,
  employeeIdsWithRatedQuarter,
  formatAnnualCutoffLabel,
} from './annualEligibility'

describe('annual eligibility', () => {
  const annual = {
    periodKey: 'annual-2026',
    startDate: '2027-01-01',
    type: 'annual' as const,
  }

  it('uses 1 Oct of the annual year as the join cutoff', () => {
    expect(annualJoinCutoffDate(annual)).toBe('2026-10-01')
    expect(formatAnnualCutoffLabel('2026-10-01')).toBe('1 Oct 2026')
  })

  it('does not apply outside annual appraisal cycles', () => {
    expect(
      annualEligibilityForEmployee({
        cycle: { periodKey: 'q3-2026', startDate: '2026-07-01', type: 'regular' },
        startDate: '2026-11-01',
        employeeId: 1,
      }),
    ).toBeNull()
  })

  it('blocks joiners after the Oct 1 cutoff', () => {
    expect(
      annualEligibilityForEmployee({
        cycle: annual,
        startDate: '2026-10-02',
        employeeId: 1,
        ratedEmployeeIds: new Set([1]),
      }),
    ).toMatchObject({
      eligible: false,
      reason: 'joined_after_cutoff',
      message:
        'Joined after 1 Oct 2026, so they’re not eligible for Annual.',
    })
  })

  it('allows joiners on the Oct 1 cutoff when they have a rated quarter', () => {
    expect(
      annualEligibilityForEmployee({
        cycle: annual,
        startDate: '2026-10-01',
        employeeId: 1,
        ratedEmployeeIds: new Set([1]),
      })?.eligible,
    ).toBe(true)
  })

  it('blocks people with no rated quarter once that set is known', () => {
    expect(
      annualEligibilityForEmployee({
        cycle: annual,
        startDate: '2025-01-01',
        employeeId: 2,
        ratedEmployeeIds: new Set([1]),
      }),
    ).toMatchObject({
      eligible: false,
      reason: 'no_rated_quarter',
      message: 'No rated quarter yet, so they’re not eligible for Annual.',
    })
  })

  it('skips the rated-quarter rule while that data is still loading', () => {
    expect(
      annualEligibilityForEmployee({
        cycle: annual,
        startDate: '2025-01-01',
        employeeId: 2,
        ratedEmployeeIds: null,
      })?.eligible,
    ).toBe(true)
  })

  it('collects employee ids with an overall quarter rating', () => {
    expect(
      employeeIdsWithRatedQuarter([
        {
          employeeId: 1,
          leaveQuarter: false,
          managerOverallGrade: 'performing',
          calibratedOverallGrade: null,
          publishedOverallGrade: null,
        },
        {
          employeeId: 2,
          leaveQuarter: true,
          managerOverallGrade: 'performing',
          calibratedOverallGrade: null,
          publishedOverallGrade: null,
        },
        {
          employeeId: 3,
          leaveQuarter: false,
          managerOverallGrade: null,
          calibratedOverallGrade: null,
          publishedOverallGrade: null,
        },
      ]),
    ).toEqual(new Set([1]))
  })
})
