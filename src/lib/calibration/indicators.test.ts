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

  it('flags tenure, streaks, tier moves, and self/manager gaps', () => {
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
        [
          packet('q1', 11, { published: 'exceptional' }),
          packet('q1', 12, { published: 'unsatisfactory' }),
        ],
      ],
      promotedEmployeeIds: new Set([11]),
    })

    const byId = Object.fromEntries(
      indicators.map((row) => [row.id, row.employeeIds]),
    )

    expect(byId.new_hire_exceeding).toEqual([10])
    expect(byId.two_cycles_exceeding).toEqual([11])
    expect(byId.three_cycles_exceeding).toEqual([11])
    expect(byId.promoted_exceeding_again).toEqual([11])
    expect(byId.two_cycles_developing).toEqual([12])
    expect(byId.three_cycles_developing).toEqual([12])
    expect(byId.improved_two_tiers).toEqual([14])
    expect(byId.self_higher_than_manager).toEqual([13])
    expect(byId.self_lower_than_manager).toEqual([])
  })

  it('compares annual grade to linked quarter average', () => {
    const annual = {
      ...makeCycle('annual', 'annual-2026', '2026-10-01', [20]),
      sourceLinks: [
        { sourceCycleId: 'q1', weightPercent: 25, excluded: false },
        { sourceCycleId: 'q2', weightPercent: 25, excluded: false },
        { sourceCycleId: 'q3', weightPercent: 25, excluded: false },
        { sourceCycleId: 'q4', weightPercent: 25, excluded: false },
      ],
    }
    const indicators = buildCalibrationIndicators({
      cycle: annual,
      employees: [employee({ employeeId: 20, fullName: 'Annual Gap' })],
      packets: [packet('annual', 20, { manager: 'exceptional' })],
      linkedPacketsByCycleId: new Map([
        ['q1', [packet('q1', 20, { published: 'performing' })]],
        ['q2', [packet('q2', 20, { published: 'performing' })]],
        ['q3', [packet('q3', 20, { published: 'performing' })]],
        ['q4', [packet('q4', 20, { published: 'performing' })]],
      ]),
    })

    expect(
      indicators.find((row) => row.id === 'annual_vs_quarterly')?.employeeIds,
    ).toEqual([20])
  })

  it('counts unsatisfactory people when no PIP set is provided', () => {
    const indicators = buildCalibrationIndicators({
      cycle,
      employees: [employee({ employeeId: 10, fullName: 'At Risk' })],
      packets: [packet('q3', 10, { manager: 'unsatisfactory' })],
    })
    expect(
      indicators.find((row) => row.id === 'unsatisfactory_no_pip')?.count,
    ).toBe(1)
  })
})
