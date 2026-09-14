import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  DEFAULT_CALIBRATION,
  DEFAULT_CYCLE_SETTINGS,
  buildDefaultStagesConfig,
} from '@/lib/reviews/demoData'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import {
  buildSelfManagerRatingGrid,
  formatTierGap,
  ratingGridTone,
} from './ratingGrid'

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
  self: GradeBandId | null,
  manager: GradeBandId | null,
): ReviewPacket {
  return {
    id: `pkt-${employeeId}`,
    cycleId: 'q3-2026',
    groupId: 'grp-1',
    employeeId,
    managerEmployeeId: 1,
    status: 'in_calibration',
    selfOverallGrade: self,
    managerOverallGrade: manager,
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

describe('ratingGridTone', () => {
  it('classifies alignment and gaps', () => {
    expect(ratingGridTone(0)).toBe('aligned')
    expect(ratingGridTone(1)).toBe('mgr_higher')
    expect(ratingGridTone(2)).toBe('red_gap')
    expect(ratingGridTone(-1)).toBe('amber_gap')
    expect(ratingGridTone(-3)).toBe('red_gap')
  })
})

describe('formatTierGap', () => {
  it('formats signed tier gaps', () => {
    expect(formatTierGap(2)).toBe('+2 tiers')
    expect(formatTierGap(-3)).toBe('-3 tiers')
    expect(formatTierGap(-1)).toBe('-1 tier')
  })
})

describe('buildSelfManagerRatingGrid', () => {
  it('builds cells, summary counts, and red-flag outliers', () => {
    const grid = buildSelfManagerRatingGrid({
      cycle: cycle([10, 11, 12, 13]),
      employees: [
        employee({ employeeId: 10, fullName: 'Kevin Miller' }),
        employee({ employeeId: 11, fullName: 'Ada Lovelace' }),
        employee({ employeeId: 12, fullName: 'Fatima Khan' }),
        employee({ employeeId: 13, fullName: 'Aisha Begum' }),
      ],
      packets: [
        packet(10, 'exceptional', 'developing'),
        packet(11, 'performing', 'performing'),
        packet(12, 'exceeding', 'performing'),
        packet(13, 'developing', 'exceeding'),
      ],
    })

    expect(grid.total).toBe(4)
    expect(grid.redFlagCount).toBe(2)
    expect(grid.amberCount).toBe(1)
    expect(grid.redFlagOutliers.map((row) => row.shortName)).toEqual([
      'Kevin M.',
      'Aisha B.',
    ])
    const aligned = grid.cells.find(
      (cell) =>
        cell.selfGrade === 'performing' &&
        cell.managerGrade === 'performing',
    )
    expect(aligned?.people).toHaveLength(1)
    expect(aligned?.tone).toBe('aligned')
  })

  it('ignores packets missing self or manager grades', () => {
    const grid = buildSelfManagerRatingGrid({
      cycle: cycle([10]),
      employees: [employee({ employeeId: 10, fullName: 'Only Self' })],
      packets: [packet(10, 'exceeding', null)],
    })
    expect(grid.total).toBe(0)
    expect(grid.cells.every((cell) => cell.people.length === 0)).toBe(true)
  })
})
