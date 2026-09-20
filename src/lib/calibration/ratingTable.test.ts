import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  DEFAULT_CALIBRATION,
  DEFAULT_CYCLE_SETTINGS,
  buildDefaultStagesConfig,
} from '@/lib/reviews/demoData'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import {
  buildEmployeeRatingRows,
  filterRatingTableRows,
  formatGapLabel,
  formatRatingTrend,
  ratingTableProgress,
} from './ratingTable'

function employee(
  partial: Partial<PlatformEmployee> & { employeeId: number; fullName: string },
): PlatformEmployee {
  return {
    email: `${partial.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    startDate: '2022-03-15',
    jobTitle: 'Engineer',
    department: 'Technology',
    team: 'Core',
    division: '',
    reportsToName: 'Ada Manager',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC3',
    site: 'BD',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    role: '',
    ...partial,
  }
}

function makeCycle(
  id: string,
  memberIds: number[],
  periodKey: string,
  startDate: string,
): ReviewCycle {
  const stages = buildDefaultStagesConfig(
    startDate,
    startDate,
    periodKey.startsWith('annual') ? 'annual_appraisal' : 'quarterly_checkin',
    periodKey,
  )
  return {
    id,
    name: id,
    type: 'regular',
    startDate,
    endDate: startDate,
    periodKey,
    yearKey: periodKey.match(/(\d{4})$/)?.[1],
    stagesConfig: stages,
    settings: DEFAULT_CYCLE_SETTINGS,
    calibration: DEFAULT_CALIBRATION,
    groups: [
      {
        id: `grp-${id}`,
        cycleId: id,
        name: 'Everyone',
        memberIds,
        stagesConfig: stages,
        settings: DEFAULT_CYCLE_SETTINGS,
        calibration: DEFAULT_CALIBRATION,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function packet(
  cycleId: string,
  employeeId: number,
  grades: {
    manager?: GradeBandId | null
    self?: GradeBandId | null
    calibrated?: GradeBandId | null
  },
): ReviewPacket {
  return {
    id: `pkt-${cycleId}-${employeeId}`,
    cycleId,
    groupId: `grp-${cycleId}`,
    employeeId,
    managerEmployeeId: 1,
    status: 'in_calibration',
    selfOverallGrade: grades.self ?? null,
    managerOverallGrade: grades.manager ?? null,
    calibratedOverallGrade: grades.calibrated ?? null,
    publishedOverallGrade: null,
    managerOverrideReason: '',
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: [],
    version: 1,
  }
}

describe('formatGapLabel', () => {
  it('labels self-higher and manager-higher gaps', () => {
    expect(formatGapLabel(0)).toBe('')
    expect(formatGapLabel(-2)).toBe('−2 Self')
    expect(formatGapLabel(1)).toBe('+1 Mgr')
  })
})

describe('buildEmployeeRatingRows', () => {
  const people = [
    employee({
      employeeId: 10,
      fullName: 'Ahmad R.',
      department: 'Technology',
      site: 'BD',
      jobGrade: 'IC3',
      reportsToName: 'Ada Manager',
    }),
    employee({
      employeeId: 11,
      fullName: 'Bea C.',
      department: 'Commercial',
      site: 'MY',
      jobGrade: 'IC2',
      reportsToName: 'Ada Manager',
    }),
  ]
  const current = makeCycle('annual-2025', [10, 11], 'annual-2025', '2025-01-01')
  const previous = makeCycle('annual-2024', [10, 11], 'annual-2024', '2024-01-01')

  it('builds gaps, prior ratings, and progress buckets', () => {
    const rows = buildEmployeeRatingRows({
      cycle: current,
      cycles: [current, previous],
      employees: people,
      packets: [
        packet('annual-2025', 10, {
          manager: 'developing',
          self: 'exceeding',
        }),
        packet('annual-2025', 11, {
          manager: 'performing',
          self: 'exceeding',
          calibrated: 'exceeding',
        }),
      ],
      previousPackets: [
        packet('annual-2024', 10, { manager: 'performing' }),
        packet('annual-2024', 11, { manager: 'performing' }),
      ],
      indicators: [
        {
          id: 'self_higher_than_manager',
          title: 'Self-rating 2+ tiers higher than manager',
          definition: 'Gap flag',
          tone: 'warning',
          count: 1,
          employeeIds: [10],
        },
      ],
    })

    expect(rows).toHaveLength(2)
    const ahmad = rows.find((row) => row.employeeId === 10)!
    expect(ahmad.isFlagged).toBe(true)
    expect(ahmad.gapTiers).toBe(-2)
    expect(formatGapLabel(ahmad.gapTiers)).toBe('−2 Self')
    expect(ahmad.priorGrade).toBe('performing')
    expect(ahmad.priorYearLabel).toBe('2024')
    expect(ahmad.trend).toBe(-1)
    expect(formatRatingTrend(ahmad.trend)).toBe('↓1')
    expect(formatRatingTrend(2)).toBe('↑2')
    expect(formatRatingTrend(0)).toBe('→')
    expect(formatRatingTrend(null)).toBe('')

    const bea = rows.find((row) => row.employeeId === 11)!
    expect(bea.isAdjusted).toBe(false)
    expect(bea.gapTiers).toBe(0)
    expect(bea.annualGrade).toBe('exceeding')

    expect(ratingTableProgress(rows)).toEqual({
      total: 2,
      flagged: 1,
      adjusted: 0,
      clean: 1,
    })
  })

  it('counts adjusted only when this sitting recorded an override', () => {
    const rows = buildEmployeeRatingRows({
      cycle: current,
      cycles: [current, previous],
      employees: people,
      packets: [
        packet('annual-2025', 11, {
          manager: 'performing',
          self: 'exceeding',
          calibrated: 'exceeding',
        }),
      ],
      adjustedEmployeeIds: new Set([11]),
    })
    const bea = rows.find((row) => row.employeeId === 11)
    expect(bea?.isAdjusted).toBe(true)
    expect(ratingTableProgress(rows).adjusted).toBe(1)
  })

  it('filters by quick chips and attributes', () => {
    const rows = buildEmployeeRatingRows({
      cycle: current,
      cycles: [current, previous],
      employees: people,
      packets: [
        packet('annual-2025', 10, {
          manager: 'developing',
          self: 'exceeding',
        }),
        packet('annual-2025', 11, {
          manager: 'exceeding',
          self: 'exceeding',
        }),
      ],
      indicators: [
        {
          id: 'self_higher_than_manager',
          title: 'Self higher',
          definition: 'Gap',
          tone: 'warning',
          count: 1,
          employeeIds: [10],
        },
      ],
    })

    expect(
      filterRatingTableRows(rows, { quickFilter: 'flagged' }).map(
        (row) => row.employeeId,
      ),
    ).toEqual([10])
    expect(
      filterRatingTableRows(rows, { quickFilter: 'gap_2' }).map(
        (row) => row.employeeId,
      ),
    ).toEqual([10])
    expect(
      filterRatingTableRows(rows, { quickFilter: 'exceeding_above' }).map(
        (row) => row.employeeId,
      ),
    ).toEqual([11])
    expect(
      filterRatingTableRows(rows, {
        quickFilter: 'all',
        market: 'MY',
      }).map((row) => row.employeeId),
    ).toEqual([11])
    expect(
      filterRatingTableRows(rows, {
        quickFilter: 'all',
        department: ['Technology', 'Commercial'],
        jobLevel: ['IC3+'],
      }).map((row) => row.employeeId),
    ).toEqual([10])
  })
})
