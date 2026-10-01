import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DemoPerson, GoalsCycle, GoalsSnapshot, PersonGoals } from '@/lib/goals/types'
import type { CycleStagesConfig, ReviewCycle } from '@/lib/reviews/types'

const mockGetCurrentReviewCycleId = vi.fn<(today?: Date) => string | null>()
const mockResolveGoalsCycle = vi.fn()
const mockAreReviewCyclesHydrated = vi.fn(() => true)
const mockGetReviewCycle = vi.fn()
const mockListScorecardForms = vi.fn(() => [])
const mockResolveCyclePolicyForPerson = vi.fn()

vi.mock('@/lib/goals/cyclesFromReviews', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/goals/cyclesFromReviews')>()
  return {
    ...actual,
    getCurrentReviewCycleId: (today?: Date) => mockGetCurrentReviewCycleId(today),
    resolveGoalsCycle: (...args: unknown[]) => mockResolveGoalsCycle(...args),
  }
})

vi.mock('@/lib/reviews/store', () => ({
  areReviewCyclesHydrated: () => mockAreReviewCyclesHydrated(),
  getReviewCycle: (id: string) => mockGetReviewCycle(id),
}))

vi.mock('@/lib/reviews/scorecardFormsStore', () => ({
  listScorecardForms: () => mockListScorecardForms(),
}))

vi.mock('@/lib/reviews/cycleGroups', () => ({
  resolveCyclePolicyForPerson: (...args: unknown[]) =>
    mockResolveCyclePolicyForPerson(...args),
}))

import {
  resolveHomeAbsence,
  resolveHomeOrientation,
  resolveHomeRhythmPhase,
  resolveNextMilestone,
} from './homeOrientation'

function person(overrides: Partial<DemoPerson> = {}): DemoPerson {
  return {
    id: '1',
    name: 'Alex Employee',
    email: 'alex@example.com',
    title: 'Engineer',
    department: 'Engineering',
    joinDate: '2026-01-01',
    reportIds: [],
    avatarHue: 200,
    blurb: '',
    ...overrides,
  }
}

function row(overrides: Partial<PersonGoals> = {}): PersonGoals {
  return {
    personId: '1',
    status: 'draft',
    goals: [],
    ...overrides,
  }
}

function cycle(overrides: Partial<GoalsCycle> = {}): GoalsCycle {
  return {
    id: 'q3-2026',
    label: 'Q3 2026',
    day1: '2026-07-01',
    phase: 'window_open',
    goalCountPolicy: {
      minimumRequired: 2,
      recommendedMinimum: 3,
      recommendedMaximum: 5,
      maximumAllowed: null,
    },
    postWindowGoalPolicy: 'two_tier_approval',
    goalWindow: { startDate: '2026-07-01', endDate: '2026-07-15' },
    assignedGroupId: 'g1',
    ...overrides,
  }
}

function stages(): CycleStagesConfig {
  return {
    processMode: 'schedule',
    goals: {
      employee: { startDate: '2026-07-01', endDate: '2026-07-15' },
    },
    performance: {
      employeeStart: { date: '2026-08-01', time: '00:00' },
      employeeEnd: { date: '2026-08-15', time: '23:59' },
      managerStart: { date: '2026-08-01', time: '00:00' },
      managerEnd: { date: '2026-08-20', time: '23:59' },
    },
    calibration: {
      enabled: true,
      start: { date: '2026-09-01', time: '00:00' },
      end: { date: '2026-09-10', time: '23:59' },
      manualStart: { date: '2026-09-01', time: '00:00' },
    },
    publish: {
      toManager: { date: '2026-09-15', time: '00:00' },
      toAll: { date: '2026-09-20', time: '00:00' },
    },
    reviewStages: [
      {
        id: 'goals',
        enabled: true,
        start: { date: '2026-07-01', time: '00:00' },
        end: { date: '2026-07-15', time: '23:59' },
      },
      {
        id: 'self_review',
        enabled: true,
        start: { date: '2026-08-01', time: '00:00' },
        end: { date: '2026-08-15', time: '23:59' },
      },
      {
        id: 'manager_review',
        enabled: true,
        start: { date: '2026-08-01', time: '00:00' },
        end: { date: '2026-08-20', time: '23:59' },
      },
      {
        id: 'calibration',
        enabled: true,
        start: { date: '2026-09-01', time: '00:00' },
        end: { date: '2026-09-10', time: '23:59' },
      },
    ],
  }
}

function snapshot(overrides: Partial<GoalsSnapshot> = {}): GoalsSnapshot {
  const baseCycle = cycle()
  return {
    cycle: baseCycle,
    cycleStatus: 'current',
    availableCycles: [{ ...baseCycle, status: 'current' }],
    activePersonId: '1',
    people: [person()],
    byPerson: { '1': row() },
    ...overrides,
  }
}

function review(): ReviewCycle {
  return {
    id: 'q3-2026',
    name: 'Q3 2026',
    periodKey: 'q3-2026',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    status: 'current',
    settings: {} as ReviewCycle['settings'],
    stagesConfig: stages(),
    calibration: { enabled: true },
    groups: [],
  } as ReviewCycle
}

describe('resolveHomeRhythmPhase', () => {
  const windows = [
    {
      phase: 'goals' as const,
      label: 'Goal setting',
      start: '2026-07-01',
      end: '2026-07-15',
      href: '/goals',
    },
    {
      phase: 'reviews' as const,
      label: 'Self-review',
      start: '2026-08-01',
      end: '2026-08-15',
      href: '/reviews',
    },
    {
      phase: 'calibrate' as const,
      label: 'Calibration',
      start: '2026-09-01',
      end: '2026-09-10',
      href: '/calibration',
    },
  ]

  it('marks goals while the goal window is open', () => {
    expect(resolveHomeRhythmPhase(windows, '2026-07-10')).toBe('goals')
  })

  it('marks reviews during the review window', () => {
    expect(resolveHomeRhythmPhase(windows, '2026-08-05')).toBe('reviews')
  })

  it('marks calibrate during calibration', () => {
    expect(resolveHomeRhythmPhase(windows, '2026-09-05')).toBe('calibrate')
  })

  it('marks done after calibration ends', () => {
    expect(resolveHomeRhythmPhase(windows, '2026-09-20')).toBe('done')
  })
})

describe('resolveNextMilestone', () => {
  it('picks the next upcoming open or end date', () => {
    const next = resolveNextMilestone(
      [
        {
          phase: 'goals',
          label: 'Goal setting',
          start: '2026-07-01',
          end: '2026-07-15',
          href: '/goals/q3/1',
        },
        {
          phase: 'reviews',
          label: 'Self-review',
          start: '2026-08-01',
          end: '2026-08-15',
          href: '/reviews/scorecards',
        },
      ],
      '2026-07-10',
    )
    expect(next).toMatchObject({
      label: 'Goal setting ends',
      date: '2026-07-15',
    })
  })
})

describe('resolveHomeOrientation', () => {
  beforeEach(() => {
    mockAreReviewCyclesHydrated.mockReturnValue(true)
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockImplementation(() => cycle())
    mockResolveCyclePolicyForPerson.mockReturnValue({
      settings: {},
      stagesConfig: stages(),
      calibration: { enabled: true },
      groupId: 'g1',
    })
    mockGetReviewCycle.mockReturnValue(review())
  })

  it('returns null when cycles are not hydrated', () => {
    mockAreReviewCyclesHydrated.mockReturnValue(false)
    expect(
      resolveHomeOrientation(person(), new Date('2026-07-10T12:00:00Z'), snapshot()),
    ).toBeNull()
  })

  it('builds orientation for the active cycle', () => {
    const result = resolveHomeOrientation(
      person(),
      new Date('2026-07-10T12:00:00Z'),
      snapshot(),
      review(),
    )
    expect(result).toMatchObject({
      cycleId: 'q3-2026',
      cycleLabel: 'Q3 2026',
      activePhase: 'goals',
      activePhaseLabel: 'Goals',
      rhythmProgress: 0,
    })
    expect(result?.phases.map((phase) => phase.progress)).toEqual([
      'active',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
    expect(result?.nextMilestone?.label).toBe('Goal setting ends')
    expect(result?.nextMilestone?.daysRemaining).toBeGreaterThanOrEqual(0)
    expect(result?.teamAttention).toBeNull()
  })

  it('includes team attention for managers with pending report goals', () => {
    const manager = person({ id: '9', reportIds: ['2'] })
    const report = person({ id: '2', name: 'Report' })
    const result = resolveHomeOrientation(
      manager,
      new Date('2026-07-10T12:00:00Z'),
      snapshot({
        people: [manager, report],
        byPerson: {
          '9': row({ personId: '9', status: 'approved', goals: [{ id: 'g' } as never] }),
          '2': row({ personId: '2', status: 'submitted', goals: [{ id: 'g2' } as never] }),
        },
      }),
      review(),
    )
    expect(result?.teamAttention).toEqual({
      goalsPending: 1,
      href: expect.stringContaining('/goals/'),
    })
  })

  it('links calibration milestones to Reviews when the viewer cannot open Calibration', () => {
    const result = resolveHomeOrientation(
      person(),
      new Date('2026-09-05T12:00:00Z'),
      snapshot(),
      review(),
      { canOpenCalibration: false },
    )
    expect(result?.activePhase).toBe('calibrate')
    expect(result?.nextMilestone?.href).toBe('/reviews/scorecards')
  })

  it('links calibration milestones to Calibration when the viewer has oversight', () => {
    const result = resolveHomeOrientation(
      person(),
      new Date('2026-09-05T12:00:00Z'),
      snapshot(),
      review(),
      { canOpenCalibration: true },
    )
    expect(result?.nextMilestone?.href).toBe('/calibration')
  })
})

describe('resolveHomeAbsence', () => {
  beforeEach(() => {
    mockAreReviewCyclesHydrated.mockReturnValue(true)
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockImplementation(() =>
      cycle({ assignedGroupId: null }),
    )
  })

  it('explains when the person is not in a cycle group', () => {
    expect(
      resolveHomeAbsence(person(), new Date('2026-07-10T12:00:00Z'), snapshot()),
    ).toMatchObject({
      kind: 'not_in_cycle',
      cycleId: 'q3-2026',
      cycleLabel: 'Q3 2026',
      title: 'You’re not in this cycle',
    })
  })

  it('returns null when the person is in the cycle', () => {
    mockResolveGoalsCycle.mockImplementation(() => cycle())
    expect(
      resolveHomeAbsence(person(), new Date('2026-07-10T12:00:00Z'), snapshot()),
    ).toBeNull()
  })
})
