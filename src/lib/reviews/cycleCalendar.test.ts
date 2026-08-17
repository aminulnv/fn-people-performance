import { describe, expect, it } from 'vitest'
import { buildDefaultStagesConfig } from './demoData'
import {
  extractCycleCalendarMarkers,
  initialCalendarMonthIndex,
  isDateInCycle,
  listCycleCalendarMonths,
  markersForDay,
  primaryCalendarFillKind,
  toIsoDate,
  weekdayIndex,
} from './cycleCalendar'
import type { ReviewCycle } from './types'

function sampleCycle(): ReviewCycle {
  const startDate = '2026-07-01'
  const endDate = '2026-09-30'
  return {
    id: 'cycle-1',
    name: 'Q3 2026',
    type: 'regular',
    startDate,
    endDate,
    stagesConfig: buildDefaultStagesConfig(startDate, endDate),
    settings: {
      reviewTypes: { line_manager: true, self: false, upwards: false, peer: false, functional_manager: false },
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
  }
}

describe('extractCycleCalendarMarkers', () => {
  it('uses the cycle timeframe as calendar bounds', () => {
    const cycle = sampleCycle()
    const markers = extractCycleCalendarMarkers(cycle)

    expect(markers.bounds).toEqual({
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    })
  })

  it('clips configured ranges to the cycle and drops out-of-cycle milestones', () => {
    const cycle = sampleCycle()
    cycle.stagesConfig.goals.extensions = [
      {
        id: 'ext-1',
        endDate: '2026-10-15',
        scope: { type: 'department', departmentId: 1, departmentName: 'Engineering' },
      },
    ]

    const markers = extractCycleCalendarMarkers(cycle)
    const goalSetting = markers.ranges.find((range) => range.kind === 'goal-setting')

    expect(goalSetting?.startDate).toBe('2026-07-01')
    expect(goalSetting?.endDate).toBe('2026-07-01')
    expect(markers.milestones.some((milestone) => milestone.kind === 'goal-extension')).toBe(
      false,
    )
    expect(markers.milestones.some((milestone) => milestone.kind === 'publish-employees')).toBe(
      false,
    )
  })
})

describe('listCycleCalendarMonths', () => {
  it('lists only months within the cycle timeframe', () => {
    expect(listCycleCalendarMonths('2026-07-01', '2026-09-30').map((m) => m.key)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ])
  })
})

describe('initialCalendarMonthIndex', () => {
  it('opens on the current month when today is inside the cycle', () => {
    const cycle = sampleCycle()
    const months = listCycleCalendarMonths(cycle.startDate, cycle.endDate)
    const index = initialCalendarMonthIndex(
      months,
      { startDate: cycle.startDate, endDate: cycle.endDate },
      new Date('2026-08-12T12:00:00'),
    )

    expect(index).toBe(1)
    expect(months[index]?.key).toBe('2026-08')
  })
})

describe('markersForDay', () => {
  it('returns active ranges for in-cycle dates only', () => {
    const markers = extractCycleCalendarMarkers(sampleCycle())
    const goalDeadline = markers.ranges.find((range) => range.kind === 'goal-setting')!
    const inCycleDay = markersForDay(goalDeadline.endDate, markers)
    const outOfCycleDay = markersForDay('2026-06-15', markers)

    expect(inCycleDay.ranges.some((range) => range.kind === 'goal-setting')).toBe(true)
    expect(outOfCycleDay.ranges).toEqual([])
    expect(outOfCycleDay.milestones).toEqual([])
  })
})

describe('primaryCalendarFillKind', () => {
  it('prefers milestones over overlapping ranges', () => {
    const dayMarkers = {
      ranges: [
        {
          kind: 'performance-review' as const,
          label: 'Performance review',
          startDate: '2026-09-01',
          endDate: '2026-09-30',
        },
      ],
      milestones: [
        {
          kind: 'publish-managers' as const,
          label: 'Publish to managers',
          date: '2026-09-15',
        },
      ],
    }

    expect(primaryCalendarFillKind(dayMarkers)).toBe('publish-managers')
  })

  it('returns null when the day has no stage marker', () => {
    expect(
      primaryCalendarFillKind({
        ranges: [
          {
            kind: 'cycle',
            label: 'Cycle timeframe',
            startDate: '2026-08-01',
            endDate: '2026-09-30',
          },
        ],
        milestones: [],
      }),
    ).toBeNull()
  })
})

describe('isDateInCycle', () => {
  it('checks inclusive cycle boundaries', () => {
    expect(isDateInCycle('2026-07-01', { startDate: '2026-07-01', endDate: '2026-09-30' })).toBe(
      true,
    )
    expect(isDateInCycle('2026-06-30', { startDate: '2026-07-01', endDate: '2026-09-30' })).toBe(
      false,
    )
  })
})

describe('calendar helpers', () => {
  it('builds ISO dates and Monday-based weekday indexes', () => {
    expect(toIsoDate(2026, 7, 1)).toBe('2026-07-01')
    expect(weekdayIndex(2026, 7, 1)).toBe(2)
  })
})
