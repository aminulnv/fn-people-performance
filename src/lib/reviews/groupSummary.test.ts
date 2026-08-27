import { describe, expect, it } from 'vitest'
import { buildDefaultStagesConfig } from './demoData'
import {
  goalCountSummary,
  gradesJobSummary,
  groupNextStep,
  groupWindowSummary,
  groupWorkLabel,
  cycleHasCalibration,
  cycleHasGoals,
  cycleHasReviews,
  includedCycleCount,
  peopleCountLabel,
} from './groupSummary'
import type { CycleGroup, ReviewCycle } from './types'

function sampleGroup(overrides: Partial<CycleGroup> = {}): CycleGroup {
  return {
    id: 'group-1',
    cycleId: 'cycle-1',
    name: 'Everyone',
    memberIds: [1],
    settings: {
      reviewTypes: {
        line_manager: true,
        self: false,
        upwards: false,
        peer: false,
        functional_manager: false,
      },
      goalCountPolicy: {
        minimumRequired: 3,
        recommendedMinimum: 4,
        recommendedMaximum: 6,
        maximumAllowed: null,
      },
      postWindowGoalPolicy: 'hard_stop',
      excludedEmployeeIds: [],
      autoScorecardGeneration: true,
    },
    stagesConfig: buildDefaultStagesConfig('2026-07-01', '2026-09-30'),
    calibration: {
      calibrationMode: 'department',
      gradeRecommendation: 'manager_average',
      gradeDistribution: {
        exceptional: 5,
        exceeding: 15,
        performing: 60,
        developing: 15,
        unsatisfactory: 5,
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('peopleCountLabel', () => {
  it('uses the singular for one person', () => {
    expect(peopleCountLabel(1)).toBe('1 person')
    expect(peopleCountLabel(0)).toBe('0 people')
  })
})

describe('groupWorkLabel', () => {
  it('names the work in plain language', () => {
    expect(groupWorkLabel({ goals: true, reviews: true })).toBe(
      'Goals and reviews',
    )
    expect(groupWorkLabel({ goals: true, reviews: false })).toBe('Goals only')
    expect(groupWorkLabel({ goals: false, reviews: true })).toBe('Reviews only')
    expect(groupWorkLabel({ goals: false, reviews: false })).toBe(
      'Nothing turned on',
    )
  })
})

describe('goalCountSummary', () => {
  it('uses the suggested range when both ends exist', () => {
    expect(
      goalCountSummary({
        minimumRequired: 3,
        recommendedMinimum: 4,
        recommendedMaximum: 6,
        maximumAllowed: null,
      }),
    ).toBe('4–6 goals')
  })
})

describe('groupNextStep', () => {
  it('asks for people before anything else', () => {
    expect(groupNextStep(sampleGroup({ memberIds: [] }))).toBe('Add People')
  })

  it('is ready when people and work are set', () => {
    expect(groupNextStep(sampleGroup())).toBeNull()
  })
})

describe('groupWindowSummary', () => {
  it('lists the windows that are on', () => {
    expect(groupWindowSummary(sampleGroup())).toMatch(/Goals /)
    expect(groupWindowSummary(sampleGroup())).toMatch(/Reviews /)
  })

  it('hides the goals window when goals are off', () => {
    const group = sampleGroup({
      stagesConfig: buildDefaultStagesConfig(
        '2029-01-01',
        '2029-02-15',
        'annual_appraisal',
        'annual-2028',
      ),
    })
    expect(groupWindowSummary(group)).toMatch(/^Reviews /)
    expect(groupWindowSummary(group)).not.toMatch(/Goals /)
  })
})

describe('gradesJobSummary', () => {
  it('uses the calibration mode label', () => {
    expect(gradesJobSummary(sampleGroup())).toBe('Department Owners')
  })
})

describe('cycleHasReviews', () => {
  it('is true when the cycle runs reviews', () => {
    expect(
      cycleHasReviews({
        stagesConfig: buildDefaultStagesConfig('2026-07-01', '2026-09-30'),
        groups: [],
      }),
    ).toBe(true)
  })

  it('is false for a goals-only quarter', () => {
    expect(
      cycleHasReviews({
        stagesConfig: buildDefaultStagesConfig(
          '2026-10-01',
          '2026-12-31',
          'quarterly_checkin',
          'q4-2026',
        ),
        groups: [],
      }),
    ).toBe(false)
  })

  it('is true when only a group has reviews on', () => {
    const goalsOnly = buildDefaultStagesConfig(
      '2026-10-01',
      '2026-12-31',
      'quarterly_checkin',
      'q4-2026',
    )
    expect(
      cycleHasReviews({
        stagesConfig: goalsOnly,
        groups: [
          sampleGroup({
            stagesConfig: buildDefaultStagesConfig('2026-07-01', '2026-09-30'),
          }),
        ],
      }),
    ).toBe(true)
  })
})

describe('cycleHasGoals', () => {
  it('is false on an annual cycle', () => {
    expect(
      cycleHasGoals({
        stagesConfig: buildDefaultStagesConfig(
          '2027-01-01',
          '2027-02-15',
          'annual_appraisal',
          'annual-2026',
        ),
        groups: [],
      }),
    ).toBe(false)
  })

  it('is true when a group still runs goals', () => {
    expect(
      cycleHasGoals({
        stagesConfig: buildDefaultStagesConfig(
          '2027-01-01',
          '2027-02-15',
          'annual_appraisal',
          'annual-2026',
        ),
        groups: [sampleGroup()],
      }),
    ).toBe(true)
  })
})

describe('cycleHasCalibration', () => {
  it('is true on an annual cycle', () => {
    expect(
      cycleHasCalibration({
        stagesConfig: buildDefaultStagesConfig(
          '2027-01-01',
          '2027-02-15',
          'annual_appraisal',
          'annual-2026',
        ),
        groups: [],
      }),
    ).toBe(true)
  })

  it('is false on a quarterly check-in', () => {
    expect(
      cycleHasCalibration({
        stagesConfig: buildDefaultStagesConfig(
          '2026-07-01',
          '2026-09-30',
          'quarterly_checkin',
          'q3-2026',
        ),
        groups: [],
      }),
    ).toBe(false)
  })
})

describe('includedCycleCount', () => {
  it('skips excluded links', () => {
    const cycle = {
      sourceLinks: [
        { sourceCycleId: 'q1', weightPercent: 50, excluded: false },
        { sourceCycleId: 'q2', weightPercent: 50, excluded: true },
      ],
    } as ReviewCycle
    expect(includedCycleCount(cycle)).toBe('1 cycle')
  })
})
