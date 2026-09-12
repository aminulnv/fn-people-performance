import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  DEFAULT_CALIBRATION,
  DEFAULT_CYCLE_SETTINGS,
  buildDefaultStagesConfig,
} from '@/lib/reviews/demoData'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import {
  buildRatingDistribution,
  chartScale,
  employeeTrack,
  sharePercent,
} from './distribution'

function employee(
  partial: Partial<PlatformEmployee> & { employeeId: number; fullName: string },
): PlatformEmployee {
  return {
    email: `${partial.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    startDate: '2024-01-01',
    jobTitle: 'Engineer',
    department: 'Product',
    team: 'Core',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC2',
    site: 'NEXT Ventures Bangladesh',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  }
}

function cycle(memberIds: number[]): Pick<ReviewCycle, 'groups' | 'calibration'> {
  const stages = buildDefaultStagesConfig(
    '2026-07-01',
    '2026-09-30',
    'quarterly_checkin',
    'q3-2026',
  )
  return {
    calibration: DEFAULT_CALIBRATION,
    groups: [
      {
        id: 'grp-1',
        cycleId: 'q3-2026',
        name: 'Everyone',
        memberIds,
        stagesConfig: stages,
        settings: DEFAULT_CYCLE_SETTINGS,
        calibration: DEFAULT_CALIBRATION,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }
}

function packet(
  employeeId: number,
  grade: GradeBandId | null,
): ReviewPacket {
  return {
    id: `pkt-${employeeId}`,
    cycleId: 'q3-2026',
    groupId: 'grp-1',
    employeeId,
    managerEmployeeId: 1,
    status: grade ? 'in_calibration' : 'not_started',
    selfOverallGrade: null,
    managerOverallGrade: grade,
    calibratedOverallGrade: null,
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

describe('sharePercent', () => {
  it('rounds the share of the whole', () => {
    expect(sharePercent(1, 3)).toBe(33)
    expect(sharePercent(0, 0)).toBe(0)
  })
})

describe('chartScale', () => {
  it('pads the peak to the next ten and never drops below 40', () => {
    expect(chartScale([0, 0])).toBe(40)
    expect(chartScale([20, 28])).toBe(40)
    expect(chartScale([35, 40])).toBe(50)
    expect(chartScale([96])).toBe(100)
  })
})

describe('employeeTrack', () => {
  it('treats anyone with reportees as managerial', () => {
    const managerIds = new Set([9])
    expect(employeeTrack(9, managerIds)).toBe('managerial')
    expect(employeeTrack(8, managerIds)).toBe('ic')
  })
})

describe('buildRatingDistribution', () => {
  const people = [
    employee({ employeeId: 1, fullName: 'Ada Manager', jobGrade: 'M1', department: 'Product', site: 'NEXT UAE' }),
    employee({ employeeId: 2, fullName: 'Bea IC', jobGrade: 'IC3', department: 'Product', site: 'NEXT UAE', reportsToId: 1, reportsToName: 'Ada Manager' }),
    employee({ employeeId: 3, fullName: 'Cara IC', jobGrade: 'IC2', department: 'Engineering', site: 'NEXT Ventures Bangladesh', reportsToId: 1, reportsToName: 'Ada Manager' }),
    employee({ employeeId: 4, fullName: 'Drew IC', jobGrade: 'IC1', department: 'Engineering', site: 'NEXT Ventures Bangladesh' }),
    employee({ employeeId: 5, fullName: 'Eve Outside', jobGrade: 'IC2', department: 'Legal' }),
  ]

  it('counts graded cycle members against the guideline', () => {
    const distribution = buildRatingDistribution({
      cycle: cycle([1, 2, 3, 4, 5]),
      employees: people,
      packets: [
        packet(1, 'exceeding'),
        packet(2, 'exceeding'),
        packet(3, 'performing'),
        packet(4, 'developing'),
        packet(5, null),
      ],
      breakdown: 'overall',
    })

    expect(distribution.summary.total).toBe(4)
    expect(distribution.summary.exceedingAndAbove).toEqual({
      count: 2,
      percent: 50,
    })
    expect(distribution.summary.performing).toEqual({ count: 1, percent: 25 })
    expect(distribution.summary.developingAndBelow).toEqual({
      count: 1,
      percent: 25,
    })
    expect(distribution.bands.map((band) => [band.id, band.count, band.percent])).toEqual([
      ['unsatisfactory', 0, 0],
      ['developing', 1, 25],
      ['performing', 1, 25],
      ['exceeding', 2, 50],
      ['exceptional', 0, 0],
    ])
    expect(distribution.bands.find((band) => band.id === 'performing')?.guidelinePercent).toBe(
      40,
    )
    expect(distribution.series).toHaveLength(1)
  })

  it('ignores people outside the cycle and packets without a grade', () => {
    const distribution = buildRatingDistribution({
      cycle: cycle([1, 2]),
      employees: people,
      packets: [packet(1, 'performing'), packet(3, 'exceptional'), packet(2, null)],
      breakdown: 'overall',
    })
    expect(distribution.summary.total).toBe(1)
    expect(distribution.bands.find((band) => band.id === 'performing')?.count).toBe(1)
    expect(distribution.bands.find((band) => band.id === 'exceptional')?.count).toBe(0)
  })

  it('splits IC vs managerial from who has reportees', () => {
    const distribution = buildRatingDistribution({
      cycle: cycle([1, 2, 3]),
      employees: people,
      packets: [
        packet(1, 'exceeding'),
        packet(2, 'performing'),
        packet(3, 'performing'),
      ],
      breakdown: 'track',
    })
    expect(distribution.series.map((row) => [row.id, row.total])).toEqual([
      ['ic', 2],
      ['managerial', 1],
    ])
    expect(
      distribution.series[0].bands.find((band) => band.id === 'performing')?.percent,
    ).toBe(100)
    expect(
      distribution.series[1].bands.find((band) => band.id === 'exceeding')?.percent,
    ).toBe(100)
  })

  it('groups markets by site and departments by name', () => {
    const byMarket = buildRatingDistribution({
      cycle: cycle([1, 2, 3, 4]),
      employees: people,
      packets: [
        packet(1, 'exceeding'),
        packet(2, 'performing'),
        packet(3, 'developing'),
        packet(4, 'developing'),
      ],
      breakdown: 'market',
    })
    expect(byMarket.series.map((row) => [row.label, row.total])).toEqual([
      ['NEXT UAE', 2],
      ['NEXT Ventures Bangladesh', 2],
    ])

    const byDepartment = buildRatingDistribution({
      cycle: cycle([1, 2, 3, 4]),
      employees: people,
      packets: [
        packet(1, 'exceeding'),
        packet(2, 'performing'),
        packet(3, 'developing'),
        packet(4, 'developing'),
      ],
      breakdown: 'department',
    })
    expect(byDepartment.series.map((row) => [row.label, row.total])).toEqual([
      ['Engineering', 2],
      ['Product', 2],
    ])
  })
})
