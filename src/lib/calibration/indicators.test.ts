import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  DEFAULT_CALIBRATION,
  DEFAULT_CYCLE_SETTINGS,
  buildDefaultStagesConfig,
} from '@/lib/reviews/demoData'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import {
  buildCalibrationIndicators,
  gradeTierDelta,
  monthsBetweenDates,
  previousCyclesOfSamePurpose,
  promotionYearWindow,
} from './indicators'

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
    site: 'NEXT Ventures Bangladesh',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  }
}

function makeCycle(
  id: string,
  periodKey: string,
  startDate: string,
  memberIds: number[],
): ReviewCycle {
  const purpose = periodKey.startsWith('annual')
    ? 'annual_appraisal'
    : 'quarterly_checkin'
  const stages = buildDefaultStagesConfig(
    startDate,
    startDate,
    purpose,
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
    published?: GradeBandId | null
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
    publishedOverallGrade: grades.published ?? null,
    managerOverrideReason: '',
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: [],
    version: 1,
  }
}

describe('monthsBetweenDates', () => {
  it('counts calendar months between ISO dates', () => {
    expect(monthsBetweenDates('2026-01-15', '2026-06-01')).toBe(5)
    expect(monthsBetweenDates('2026-01-15', '2026-07-15')).toBe(6)
  })
})

describe('gradeTierDelta', () => {
  it('returns signed band distance', () => {
    expect(gradeTierDelta('exceeding', 'developing')).toBe(-2)
    expect(gradeTierDelta('developing', 'exceeding')).toBe(2)
    expect(gradeTierDelta(null, 'performing')).toBeNull()
  })
})

describe('previousCyclesOfSamePurpose', () => {
  it('returns earlier cycles of the same purpose, newest first', () => {
    const current = makeCycle('q3', 'q3-2026', '2026-07-01', [1])
    const q2 = makeCycle('q2', 'q2-2026', '2026-04-01', [1])
    const q1 = makeCycle('q1', 'q1-2026', '2026-01-01', [1])
    const annual = makeCycle('a25', 'annual-2025', '2025-10-01', [1])
    expect(
      previousCyclesOfSamePurpose(current, [current, q2, q1, annual], 2).map(
        (cycle) => cycle.id,
      ),
    ).toEqual(['q2', 'q1'])
  })

  it('treats half-year appraisals as the previous annual cycles', () => {
    const annual = makeCycle('annual-2026', 'annual-2026', '2026-01-01', [1])
    const h2 = makeCycle('h2-2025', 'h2-2025', '2025-07-01', [1])
    const h1 = makeCycle('h1-2025', 'h1-2025', '2025-01-01', [1])
    const quarter = makeCycle('q4-2025', 'q4-2025', '2025-10-01', [1])
    expect(
      previousCyclesOfSamePurpose(annual, [annual, h2, h1, quarter], 2).map(
        (cycle) => cycle.id,
      ),
    ).toEqual(['h2-2025', 'h1-2025'])
  })
})

describe('buildCalibrationIndicators', () => {
  const members = [10, 11, 12, 13, 14]
  const cycle = makeCycle('q3', 'q3-2026', '2026-07-01', members)
  const employees = [
    employee({ employeeId: 10, fullName: 'New Hire', startDate: '2026-03-01' }),
    employee({ employeeId: 11, fullName: 'Steady Star' }),
    employee({ employeeId: 12, fullName: 'Slipping' }),
    employee({
      employeeId: 13,
      fullName: 'Self Optimistic',
    }),
    employee({ employeeId: 14, fullName: 'Improving' }),
  ]

  it('flags a gap of more than one band against the previous cycle, and a 2-band self gap', () => {
    const indicators = buildCalibrationIndicators({
      cycle,
      employees,
      packets: [
        packet('q3', 10, { manager: 'exceeding' }),
        packet('q3', 11, { manager: 'exceptional' }),
        packet('q3', 12, { manager: 'developing' }),
        packet('q3', 13, {
          self: 'exceptional',
          manager: 'performing',
        }),
        packet('q3', 14, { manager: 'exceeding' }),
      ],
      previousPackets: [
        [
          packet('q2', 11, { published: 'exceeding' }),
          packet('q2', 12, { published: 'developing' }),
          packet('q2', 14, { published: 'developing' }),
        ],
      ],
    })

    const byId = Object.fromEntries(
      indicators.map((row) => [row.id, row.employeeIds]),
    )

    expect(byId.previous_cycle_gap).toEqual([14])
    expect(byId.promoted_last_12_months).toEqual([])
    expect(byId.self_higher_than_manager).toEqual([13])
    expect(byId.self_lower_than_manager).toEqual([])
  })

  it('compares the annual grade to H2, not to an average with H1', () => {
    const annual = makeCycle('annual-2026', 'annual-2026', '2026-01-01', [20])
    const indicators = buildCalibrationIndicators({
      cycle: annual,
      employees: [employee({ employeeId: 20, fullName: 'Annual Gap' })],
      packets: [packet('annual-2026', 20, { manager: 'exceptional' })],
      previousPackets: [
        [packet('h2-2025', 20, { published: 'exceeding' })],
        [packet('h1-2025', 20, { published: 'unsatisfactory' })],
      ],
    })

    expect(
      indicators.find((row) => row.id === 'previous_cycle_gap')?.employeeIds,
    ).toEqual([])
  })

  it('flags when the annual grade is more than one band from H2', () => {
    const annual = makeCycle('annual-2026', 'annual-2026', '2026-01-01', [21])
    const indicators = buildCalibrationIndicators({
      cycle: annual,
      employees: [employee({ employeeId: 21, fullName: 'Far' })],
      packets: [packet('annual-2026', 21, { manager: 'exceptional' })],
      previousPackets: [[packet('h2-2025', 21, { published: 'performing' })]],
    })
    expect(
      indicators.find((row) => row.id === 'previous_cycle_gap')?.employeeIds,
    ).toEqual([21])
  })

  it('flags a promotion inside the cycle year window', () => {
    const cycle = makeCycle('annual', 'annual-2026', '2026-10-01', [30])
    expect(promotionYearWindow(cycle)).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    })
    const indicators = buildCalibrationIndicators({
      cycle,
      employees: [employee({ employeeId: 30, fullName: 'Promoted' })],
      packets: [packet('annual', 30, { manager: 'performing' })],
      promotedInWindowEmployeeIds: new Set([30]),
    })
    expect(
      indicators.find((row) => row.id === 'promoted_last_12_months')
        ?.employeeIds,
    ).toEqual([30])
  })
})
