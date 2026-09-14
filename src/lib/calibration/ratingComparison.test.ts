import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  DEFAULT_CALIBRATION,
  DEFAULT_CYCLE_SETTINGS,
  buildDefaultStagesConfig,
} from '@/lib/reviews/demoData'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import {
  buildRatingComparisonGroups,
  buildRatingComparisonModel,
  comparisonTone,
} from './ratingComparison'

function employee(
  partial: Partial<PlatformEmployee> & { employeeId: number; fullName: string },
): PlatformEmployee {
  return {
    email: `${partial.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    startDate: '2020-01-01',
    jobTitle: 'Engineer',
    department: 'Technology',
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

describe('comparisonTone', () => {
  it('bands deltas around on-par', () => {
    expect(comparisonTone(0.1)).toBe('on')
    expect(comparisonTone(0.4)).toBe('above')
    expect(comparisonTone(-0.5)).toBe('below')
  })
})

describe('buildRatingComparisonModel', () => {
  it('builds department bars against the all-group average', () => {
    const employees = [
      employee({ employeeId: 1, fullName: 'Mgr', department: 'Technology' }),
      employee({
        employeeId: 10,
        fullName: 'A',
        department: 'Technology',
        reportsToId: 1,
      }),
      employee({
        employeeId: 11,
        fullName: 'B',
        department: 'Technology',
        reportsToId: 1,
      }),
      employee({
        employeeId: 12,
        fullName: 'C',
        department: 'Commercial',
        reportsToId: 1,
      }),
      employee({
        employeeId: 13,
        fullName: 'D',
        department: 'Commercial',
        reportsToId: 1,
      }),
    ]
    const groups = buildRatingComparisonGroups({
      cycle: cycle([10, 11, 12, 13]),
      employees,
      packets: [
        packet(10, 1, 'exceeding'),
        packet(11, 1, 'exceeding'),
        packet(12, 1, 'performing'),
        packet(13, 1, 'developing'),
      ],
      view: 'department',
    })
    const model = buildRatingComparisonModel({
      groups,
      scopeId: 'all',
      baselineId: 'avg',
    })

    expect(model.rows.map((row) => row.label)).toEqual([
      'Technology',
      'Commercial',
    ])
    expect(model.baselineScore).toBe(3.25)
    expect(model.rows[0]?.tone).toBe('above')
    expect(model.rows[1]?.tone).toBe('below')
  })
})
