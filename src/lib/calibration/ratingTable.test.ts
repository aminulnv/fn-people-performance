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
    expect(formatGapLabel(1)).toBe('+1 Manager')
  })
})

describe('buildEmployeeRatingRows', () => {
  const people = [
    employee({
      employeeId: 1,
      fullName: 'Ada Manager',
      reportsToName: '',
      avatarUrl: 'https://example.com/ada.png',
      jobGrade: 'M2',
    }),
    employee({
      employeeId: 10,
      fullName: 'Ahmad R.',
      department: 'Technology',
      site: 'BD',
      jobGrade: 'IC3',
      reportsToName: 'Ada Manager',
      reportsToId: 1,
    }),
    employee({
      employeeId: 11,
      fullName: 'Bea C.',
      department: 'Commercial',
      site: 'MY',
      jobGrade: 'IC2',
      reportsToName: 'Ada Manager',
      reportsToId: 1,
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
          title: 'Self-Rating 2+ Tiers Higher Than Manager',
          definition: 'Gap flag',
          tone: 'warning',
          count: 1,
          employeeIds: [10],
        },
      ],
    })

    expect(rows).toHaveLength(2)
    const ahmad = rows.find((row) => row.employeeId === 10)!
    expect(ahmad.managerName).toBe('Ada Manager')
    expect(ahmad.managerAvatarUrl).toBe('https://example.com/ada.png')
    expect(ahmad.isFlagged).toBe(true)
    expect(ahmad.gapTiers).toBe(-2)
    expect(formatGapLabel(ahmad.gapTiers)).toBe('−2 Self')
    expect(ahmad.priorGrade).toBe('performing')
    expect(ahmad.priorYearLabel).toBe('2024')
    expect(ahmad.trend).toBe(-1)
    expect(ahmad.calibrationStatus).toBe('not_reviewed')
    expect(ahmad.sessionNotes).toBe('')
    expect(ahmad.onPip).toBe(false)
    expect(ahmad.team).toBe('Core')
    expect(formatRatingTrend(ahmad.trend)).toBe('↓1')
    expect(formatRatingTrend(2)).toBe('↑2')
    expect(formatRatingTrend(0)).toBe('→')
    expect(formatRatingTrend(null)).toBe('')

    const bea = rows.find((row) => row.employeeId === 11)!
    expect(bea.isAdjusted).toBe(false)
    expect(bea.gapTiers).toBe(0)
    expect(bea.managerGrade).toBe('performing')
    expect(bea.annualGrade).toBe('exceeding')

    expect(ratingTableProgress(rows)).toEqual({
      total: 2,
      flagged: 1,
      adjusted: 0,
      clean: 1,
    })
  })

  it('leaves final rating empty until the manager has rated', () => {
    const rows = buildEmployeeRatingRows({
      cycle: current,
      cycles: [current, previous],
      employees: people,
      packets: [
        packet('annual-2025', 10, {
          self: 'performing',
        }),
        packet('annual-2025', 11, {
          manager: 'performing',
          self: 'exceeding',
        }),
      ],
    })

    const withoutManager = rows.find((row) => row.employeeId === 10)!
    expect(withoutManager.selfGrade).toBe('performing')
    expect(withoutManager.managerGrade).toBeNull()
    expect(withoutManager.annualGrade).toBeNull()
    expect(withoutManager.gapTiers).toBeNull()

    const withManager = rows.find((row) => row.employeeId === 11)!
    expect(withManager.managerGrade).toBe('performing')
    expect(withManager.annualGrade).toBe('performing')
  })

  it('maps sitting status, notes, pip, and adjusted onto rows', () => {
    const rows = buildEmployeeRatingRows({
      cycle: current,
      cycles: [current, previous],
      employees: [
        ...people.slice(0, 2),
        employee({
          employeeId: 11,
          fullName: 'Bea C.',
          department: 'Commercial',
          site: 'MY',
          jobGrade: 'IC2',
          reportsToName: 'Ada Manager',
          reportsToId: 1,
          onPip: true,
        }),
      ],
      packets: [
        packet('annual-2025', 10, {
          manager: 'developing',
          self: 'exceeding',
        }),
        packet('annual-2025', 11, {
          manager: 'performing',
          self: 'exceeding',
        }),
      ],
      sittingEmployees: [
        {
          employeeId: 10,
          status: 'discussed',
          notes: 'Needs HRBP co-sign',
          adjustedAt: null,
        },
        {
          employeeId: 11,
          status: 'rating_changed',
          notes: '',
          adjustedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })

    const ahmad = rows.find((row) => row.employeeId === 10)!
    expect(ahmad.calibrationStatus).toBe('discussed')
    expect(ahmad.sessionNotes).toBe('Needs HRBP co-sign')
    expect(ahmad.isAdjusted).toBe(false)
    expect(ahmad.onPip).toBe(false)

    const bea = rows.find((row) => row.employeeId === 11)!
    expect(bea.calibrationStatus).toBe('rating_changed')
    expect(bea.isAdjusted).toBe(true)
    expect(bea.onPip).toBe(true)
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
      adjustedEmployeeIds: new Set([10]),
    })

    // Flagged+adjusted counts under Adjusted in progress, not Flagged.
    expect(
      filterRatingTableRows(rows, { quickFilter: 'flagged' }).map(
        (row) => row.employeeId,
      ),
    ).toEqual([])
    expect(
      filterRatingTableRows(rows, { quickFilter: 'adjusted' }).map(
        (row) => row.employeeId,
      ),
    ).toEqual([10])
    expect(ratingTableProgress(rows)).toEqual({
      total: 2,
      flagged: 0,
      adjusted: 1,
      clean: 1,
    })
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
      filterRatingTableRows(rows, { quickFilter: 'clean' }).map(
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
    expect(
      filterRatingTableRows(rows, {
        quickFilter: 'all',
        columnFilters: { market: ['MY'] },
      }).map((row) => row.employeeId),
    ).toEqual([11])
    expect(
      filterRatingTableRows(rows, {
        quickFilter: 'all',
        columnFilters: {
          annual: ['Exceeding'],
          department: ['Technology'],
        },
      }).map((row) => row.employeeId),
    ).toEqual([])
    expect(
      filterRatingTableRows(rows, {
        quickFilter: 'all',
        columnFilters: { gap: ['−2 Self'] },
      }).map((row) => row.employeeId),
    ).toEqual([10])
  })
})
