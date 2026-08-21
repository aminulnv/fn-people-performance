import { describe, expect, it } from 'vitest'
import { buildDefaultStagesConfig } from './demoData'
import {
  cycleForOverviewCalendar,
  extractCycleCalendarMarkers,
  initialCalendarMonthIndex,
  isDateInCycle,
  listCycleCalendarMonths,
  markersForDay,
  primaryCalendarFillKind,
  toIsoDate,
  listCalendarMonthCells,
  sundayWeekdayIndex,
  weekdayIndex,
} from './cycleCalendar'
import type { ReviewCycle } from './types'

function sampleCycle(): ReviewCycle {
  const startDate = '2026-07-01'
  const endDate = '2026-09-30'
  const stagesConfig = buildDefaultStagesConfig(startDate, endDate)
  const settings = {
    reviewTypes: { line_manager: true, self: false, upwards: false, peer: false, functional_manager: false },
    goalCountPolicy: {
      minimumRequired: 3,
      recommendedMinimum: 4,
      recommendedMaximum: 6,
      maximumAllowed: null,
    },
    postWindowGoalPolicy: 'hard_stop' as const,
    excludedEmployeeIds: [],
    autoScorecardGeneration: true,
  }
  const calibration = {
    calibrationMode: 'department' as const,
    gradeRecommendation: 'manager_average' as const,
    gradeDistribution: {
      exceptional: 5,
      exceeding: 15,
      performing: 60,
      developing: 15,
      unsatisfactory: 5,
    },
  }
  return {
    id: 'cycle-1',
    name: 'Q3 2026',
    type: 'regular',
    startDate,
    endDate,
    stagesConfig,
    settings,
    calibration,
    groups: [
      {
        id: 'group-1',
        cycleId: 'cycle-1',
        name: 'Everyone',
        memberIds: [1],
        settings,
        stagesConfig,
        calibration,
        createdAt: '2026-01-01T00:00:00.000Z',
        version: 1,
      },
    ],
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

  it('paints group windows, not leftover cycle-level defaults', () => {
    const empty = sampleCycle()
    empty.groups = []
    expect(
      extractCycleCalendarMarkers(empty).ranges.every((range) => range.kind === 'cycle'),
    ).toBe(true)

    const cycle = sampleCycle()
    const group = cycle.groups?.[0]
    if (!group) throw new Error('Expected a sample group')
    group.stagesConfig.goals.employee = {
      startDate: '2026-07-01',
      endDate: '2026-07-15',
    }

    const markers = extractCycleCalendarMarkers(cycle)
    const goalSetting = markers.ranges.find((range) => range.kind === 'goal-setting')

    expect(goalSetting?.startDate).toBe('2026-07-01')
    expect(goalSetting?.endDate).toBe('2026-07-15')
    expect(markers.milestones.some((milestone) => milestone.kind === 'goal-extension')).toBe(
      false,
    )
  })
})

describe('cycleForOverviewCalendar', () => {
  it('keeps stages only when the cycle has a single group', () => {
    const cycle = sampleCycle()
    expect(cycleForOverviewCalendar(cycle).groups).toEqual(cycle.groups)

    const empty = sampleCycle()
    empty.groups = []
    expect(cycleForOverviewCalendar(empty).groups).toEqual([])

    const many = sampleCycle()
    const first = many.groups?.[0]
    if (!first) throw new Error('Expected a sample group')
    many.groups = [first, { ...first, id: 'group-2' }]
    expect(cycleForOverviewCalendar(many).groups).toEqual([])
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

  it('builds a Sunday-start month grid with neighbouring days', () => {
    expect(sundayWeekdayIndex(2026, 4, 1)).toBe(3)
    const cells = listCalendarMonthCells(2026, 4)
    expect(cells).toHaveLength(42)
    expect(cells[0]).toEqual({ iso: '2026-03-29', day: 29, inMonth: false })
    expect(cells[3]).toEqual({ iso: '2026-04-01', day: 1, inMonth: true })
    expect(cells[32]).toEqual({ iso: '2026-04-30', day: 30, inMonth: true })
    expect(cells[41]).toEqual({ iso: '2026-05-09', day: 9, inMonth: false })
  })
})
