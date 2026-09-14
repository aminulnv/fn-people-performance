import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  DEFAULT_CALIBRATION,
  DEFAULT_CYCLE_SETTINGS,
  buildDefaultStagesConfig,
} from '@/lib/reviews/demoData'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import {
  buildManagerRatingHeatmap,
  shortManagerName,
  vsOrgKind,
} from './managerHeatmap'

function employee(
  partial: Partial<PlatformEmployee> & { employeeId: number; fullName: string },
): PlatformEmployee {
  return {
    email: `${partial.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    startDate: '2020-01-01',
    jobTitle: 'Engineer',
    department: 'Product',
    team: 'Core',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC2',
    site: 'NEXT UAE',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  }
}

function cycle(memberIds: number[]): Pick<ReviewCycle, 'groups'> {
  const stages = buildDefaultStagesConfig(
    '2026-07-01',
    '2026-09-30',
    'quarterly_checkin',
    'q3-2026',
  )
  return {
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
  managerEmployeeId: number,
  grade: GradeBandId,
): ReviewPacket {
  return {
    id: `pkt-${employeeId}`,
    cycleId: 'q3-2026',
    groupId: 'grp-1',
    employeeId,
    managerEmployeeId,
    status: 'in_calibration',
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

describe('shortManagerName', () => {
  it('uses first name and last initial', () => {
    expect(shortManagerName('Jawad Ahmed')).toBe('Jawad A.')
    expect(shortManagerName('Angie')).toBe('Angie')
  })
})

describe('vsOrgKind', () => {
  it('classifies deltas around the on-average band', () => {
    expect(vsOrgKind(0.15)).toBe('on')
    expect(vsOrgKind(-0.02)).toBe('on')
    expect(vsOrgKind(0.32)).toBe('above')
    expect(vsOrgKind(-0.6)).toBe('below')
  })
})

describe('buildManagerRatingHeatmap', () => {
  it('builds per-manager band shares, averages, and outlier flags', () => {
    const employees = [
      employee({ employeeId: 1, fullName: 'Jawad Ahmed' }),
      employee({ employeeId: 2, fullName: 'Fahim Alam' }),
      employee({ employeeId: 10, fullName: 'A', reportsToId: 1 }),
      employee({ employeeId: 11, fullName: 'B', reportsToId: 1 }),
      employee({ employeeId: 12, fullName: 'C', reportsToId: 1 }),
      employee({ employeeId: 13, fullName: 'D', reportsToId: 1 }),
      employee({ employeeId: 20, fullName: 'E', reportsToId: 2 }),
      employee({ employeeId: 21, fullName: 'F', reportsToId: 2 }),
    ]
    const heatmap = buildManagerRatingHeatmap({
      cycle: cycle([10, 11, 12, 13, 20, 21]),
      employees,
      packets: [
        packet(10, 1, 'developing'),
        packet(11, 1, 'performing'),
        packet(12, 1, 'exceeding'),
        packet(13, 1, 'exceptional'),
        packet(20, 2, 'developing'),
        packet(21, 2, 'developing'),
      ],
    })

    expect(heatmap.rows).toHaveLength(2)
    const jawad = heatmap.rows.find((row) => row.managerEmployeeId === 1)
    const fahim = heatmap.rows.find((row) => row.managerEmployeeId === 2)
    expect(jawad?.shortName).toBe('Jawad A.')
    expect(jawad?.teamSize).toBe(4)
    expect(jawad?.cells.find((cell) => cell.bandId === 'performing')?.percent).toBe(
      25,
    )
    expect(fahim?.cells.find((cell) => cell.bandId === 'developing')?.outlier).toBe(
      true,
    )
    expect(
      fahim?.cells.find((cell) => cell.bandId === 'unsatisfactory')?.outlier,
    ).toBe(true)
    expect(fahim?.averageBand).toBe('developing')
    expect(fahim?.vsOrgKind).toBe('below')
  })

  it('returns an empty row list when nobody is graded', () => {
    const heatmap = buildManagerRatingHeatmap({
      cycle: cycle([10]),
      employees: [
        employee({ employeeId: 1, fullName: 'Boss' }),
        employee({ employeeId: 10, fullName: 'Report', reportsToId: 1 }),
      ],
      packets: [],
    })
    expect(heatmap.rows).toEqual([])
    expect(heatmap.orgAverageScore).toBeNull()
  })
})
