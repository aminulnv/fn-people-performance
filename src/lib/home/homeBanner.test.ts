import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DemoPerson, GoalsCycle, GoalsSnapshot, PersonGoals } from '@/lib/goals/types'

const mockGetGoalsSnapshot = vi.fn<() => GoalsSnapshot>()
const mockGetCurrentReviewCycleId = vi.fn<(today?: Date) => string | null>()
const mockResolveGoalsCycle = vi.fn<
  (
    cycleId: string,
    manualPhase: GoalsCycle['phase'],
    today?: Date,
    employeeId?: number | null,
  ) => GoalsCycle | null
>()
const mockGetReviewCycle = vi.fn()
const mockAreReviewCyclesHydrated = vi.fn(() => true)

vi.mock('@/lib/goals/store', () => ({
  getGoalsSnapshot: () => mockGetGoalsSnapshot(),
}))

vi.mock('@/lib/goals/cyclesFromReviews', () => ({
  getCurrentReviewCycleId: (today?: Date) => mockGetCurrentReviewCycleId(today),
  parseGoalsEmployeeId: (personId?: string | number | null) => {
    if (personId == null || personId === '') return undefined
    const employeeId = Number(personId)
    return Number.isInteger(employeeId) ? employeeId : undefined
  },
  resolveGoalsCycle: (
    cycleId: string,
    manualPhase: GoalsCycle['phase'],
    today?: Date,
    employeeId?: number | null,
  ) => mockResolveGoalsCycle(cycleId, manualPhase, today, employeeId),
}))

vi.mock('@/lib/reviews/store', () => ({
  getReviewCycle: (id: string) => mockGetReviewCycle(id),
  areReviewCyclesHydrated: () => mockAreReviewCyclesHydrated(),
}))

import { resolveHomeBanners, hasCommittedGoalSubmission, needsOwnGoalSubmission } from './homeBanner'

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
    goalWindow: { startDate: '2026-06-06', endDate: '2026-07-01' },
    ...overrides,
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

describe('resolveHomeBanners', () => {
  beforeEach(() => {
    mockAreReviewCyclesHydrated.mockReturnValue(true)
  })

  it('shows the sent-back banner on its own', () => {
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        byPerson: {
          '1': row({
            status: 'sent_back',
            sendBackBy: { id: 'm1', name: 'Aminul Islam Boman' },
          }),
        },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(cycle())

    const banners = resolveHomeBanners(person())
    expect(banners).toHaveLength(1)
    expect(banners[0]?.variant).toBe('modify_goals')
    expect(banners[0]?.headline).toBe('Your Goals Were Sent Back')
    expect(banners[0]?.subline).toBe('Aminul Islam Boman sent your goals back.')
    expect(banners[0]?.icon).toBe('sent_back')
    expect(banners[0]?.aside).toEqual({
      kind: 'action',
      primary: 'Modify Goals',
      secondary: 'For Approval',
    })
  })

  it('shows both own goal-setting and team approval banners for managers', () => {
    const manager = person({ id: 'm1', reportIds: ['1'] })
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        people: [manager, person({ id: '1', managerId: 'm1' })],
        byPerson: {
          m1: row({ personId: 'm1', status: 'draft' }),
          '1': row({
            personId: '1',
            status: 'submitted',
            goals: [{ id: 'g1', description: 'Ship', weight: 100, measurements: [] }],
          }),
        },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(cycle())

    const banners = resolveHomeBanners(manager)
    expect(banners.map((banner) => banner.variant)).toEqual([
      'set_goals',
      'approve_team_goals',
    ])
    expect(banners[0]?.headline).toBe('Set your Q3 Goals')
    expect(banners[1]?.headline).toBe("Approve your team's Q3 Goals")
  })

  it('shows team approval only when the manager has already submitted', () => {
    const manager = person({ id: 'm1', reportIds: ['1'] })
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        people: [manager, person({ id: '1', managerId: 'm1' })],
        byPerson: {
          m1: row({
            personId: 'm1',
            status: 'approved',
            goals: [{ id: 'g1', description: 'Grow', weight: 100, measurements: [] }],
          }),
          '1': row({
            personId: '1',
            status: 'submitted',
            goals: [{ id: 'g2', description: 'Ship', weight: 100, measurements: [] }],
          }),
        },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(cycle())

    const banners = resolveHomeBanners(manager)
    expect(banners).toHaveLength(1)
    expect(banners[0]?.variant).toBe('approve_team_goals')
    expect(banners[0]?.href).toBe('/goals/q3-2026/m1#my-reports')
  })

  it('uses the personal goal-setting headline for managers with reportees', () => {
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        byPerson: { '1': row({ personId: '1', status: 'draft' }) },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(cycle())

    const banners = resolveHomeBanners(person({ reportIds: ['2', '3'] }))
    expect(banners).toHaveLength(1)
    expect(banners[0]?.variant).toBe('set_goals')
    expect(banners[0]?.headline).toBe('Set your Q3 Goals')
  })

  it('shows progress updates during check-in when goals are approved', () => {
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        byPerson: {
          '1': row({
            status: 'approved',
            goals: [{ id: 'g1', description: 'Ship', weight: 100, measurements: [] }],
          }),
        },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(cycle({ phase: 'check_in' }))
    mockGetReviewCycle.mockReturnValue({
      stagesConfig: {
        performance: {
          employeeEnd: { date: '2026-09-30', time: '14:00' },
        },
      },
    })

    const banners = resolveHomeBanners(person(), new Date('2026-09-01T12:00:00.000Z'))
    expect(banners).toHaveLength(1)
    expect(banners[0]?.variant).toBe('update_progress')
    expect(banners[0]?.headline).toBe('Update Goal Progress')
  })

  it('returns no banners when the employee has already submitted', () => {
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        byPerson: {
          '1': row({
            status: 'submitted',
            goals: [{ id: 'g1', description: 'Ship', weight: 100, measurements: [] }],
          }),
        },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(cycle())

    expect(resolveHomeBanners(person())).toEqual([])
  })

  it('marks goal-setting banners as yellow at 5 days and red below 3 days', () => {
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        byPerson: { '1': row({ personId: '1', status: 'draft' }) },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(
      cycle({
        goalWindow: { startDate: '2026-06-06', endDate: '2026-08-25' },
      }),
    )

    const warning = resolveHomeBanners(person(), new Date('2026-08-20T12:00:00.000Z'))
    expect(warning[0]?.urgency).toBe('warning')

    mockResolveGoalsCycle.mockReturnValue(
      cycle({
        goalWindow: { startDate: '2026-06-06', endDate: '2026-08-21' },
      }),
    )
    const critical = resolveHomeBanners(person(), new Date('2026-08-20T12:00:00.000Z'))
    expect(critical[0]?.urgency).toBe('critical')
  })

  it('applies the same deadline urgency to team approval banners', () => {
    const manager = person({ id: 'm1', reportIds: ['1'] })
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        people: [manager, person({ id: '1', managerId: 'm1' })],
        byPerson: {
          m1: row({ personId: 'm1', status: 'draft' }),
          '1': row({
            personId: '1',
            status: 'submitted',
            goals: [{ id: 'g1', description: 'Ship', weight: 100, measurements: [] }],
          }),
        },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(
      cycle({
        goalWindow: { startDate: '2026-06-06', endDate: '2026-08-27' },
      }),
    )

    const sevenDays = resolveHomeBanners(manager, new Date('2026-08-20T12:00:00.000Z'))
    expect(sevenDays.map((banner) => banner.urgency)).toEqual(['default', 'default'])

    mockResolveGoalsCycle.mockReturnValue(
      cycle({
        goalWindow: { startDate: '2026-06-06', endDate: '2026-08-25' },
      }),
    )
    const fiveDays = resolveHomeBanners(manager, new Date('2026-08-20T12:00:00.000Z'))
    expect(fiveDays.map((banner) => banner.urgency)).toEqual(['warning', 'warning'])

    mockResolveGoalsCycle.mockReturnValue(
      cycle({
        goalWindow: { startDate: '2026-06-06', endDate: '2026-08-21' },
      }),
    )
    const twoDays = resolveHomeBanners(manager, new Date('2026-08-20T12:00:00.000Z'))
    expect(twoDays.map((banner) => banner.urgency)).toEqual(['critical', 'critical'])
  })

  it('treats drafts as unsubmitted and ignores empty approved rows', () => {
    expect(needsOwnGoalSubmission(row({ status: 'draft', goals: [] }))).toBe(true)
    expect(
      needsOwnGoalSubmission(
        row({
          status: 'draft',
          goals: [{ id: 'g1', description: 'Ship', weight: 100, measurements: [] }],
        }),
      ),
    ).toBe(true)
    expect(
      hasCommittedGoalSubmission(
        row({
          status: 'approved',
          goals: [{ id: 'g1', description: 'Ship', weight: 100, measurements: [] }],
        }),
      ),
    ).toBe(true)
    expect(hasCommittedGoalSubmission(row({ status: 'approved', goals: [] }))).toBe(
      false,
    )
    expect(needsOwnGoalSubmission(row({ status: 'approved', goals: [] }))).toBe(true)
  })

  it('returns no banners when the person is not in a cycle group', () => {
    mockGetGoalsSnapshot.mockReturnValue(snapshot())
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(
      cycle({ assignedGroupId: null, phase: 'not_open' }),
    )

    expect(resolveHomeBanners(person())).toEqual([])
  })

  it('returns no banners while review membership is still loading', () => {
    mockAreReviewCyclesHydrated.mockReturnValue(false)
    mockGetGoalsSnapshot.mockReturnValue(snapshot())
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(cycle())

    expect(resolveHomeBanners(person())).toEqual([])
  })

  it('says due today instead of zero days remaining', () => {
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        byPerson: { '1': row({ personId: '1', status: 'draft' }) },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(cycle())

    const banners = resolveHomeBanners(
      person(),
      new Date('2026-07-01T12:00:00.000Z'),
    )
    expect(banners[0]?.timing).toBe('due_today')
    expect(banners[0]?.subline).toBe('Due today')
    expect(banners[0]?.sublineEmphasis).toBeUndefined()
    expect(banners[0]?.aside).toEqual({
      kind: 'countdown',
      primary: 'Due',
      secondary: 'Today',
    })
    expect(banners[0]?.ariaLabel).toBe('Set your Q3 Goals. Due today.')
  })

  it('marks late two-tier goal setting as overdue, not zero days remaining', () => {
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        byPerson: { '1': row({ personId: '1', status: 'draft' }) },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(
      cycle({
        phase: 'hard_lock',
        postWindowGoalPolicy: 'two_tier_approval',
      }),
    )

    const banners = resolveHomeBanners(
      person(),
      new Date('2026-08-23T12:00:00.000Z'),
    )
    expect(banners[0]?.headline).toBe('Set your Q3 Goals')
    expect(banners[0]?.timing).toBe('overdue')
    expect(banners[0]?.subline).toBe('Was due ')
    expect(banners[0]?.sublineEmphasis).toBe('1st July 2026')
    expect(banners[0]?.aside).toEqual({
      kind: 'status',
      primary: 'Overdue',
      secondary: '',
    })
    expect(banners[0]?.ariaLabel).toBe(
      'Set your Q3 Goals. Overdue, was due 1st July 2026.',
    )
  })

  it('marks pending team approvals overdue after the deadline', () => {
    const manager = person({ id: 'm1', reportIds: ['1'] })
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        people: [manager, person({ id: '1', managerId: 'm1' })],
        byPerson: {
          m1: row({
            personId: 'm1',
            status: 'approved',
            goals: [{ id: 'g1', description: 'Grow', weight: 100, measurements: [] }],
          }),
          '1': row({
            personId: '1',
            status: 'submitted',
            goals: [{ id: 'g2', description: 'Ship', weight: 100, measurements: [] }],
          }),
        },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(
      cycle({
        phase: 'hard_lock',
        postWindowGoalPolicy: 'two_tier_approval',
      }),
    )

    const banners = resolveHomeBanners(
      manager,
      new Date('2026-08-23T12:00:00.000Z'),
    )
    expect(banners).toHaveLength(1)
    expect(banners[0]?.variant).toBe('approve_team_goals')
    expect(banners[0]?.headline).toBe("Approve your team's Q3 Goals")
    expect(banners[0]?.subline).toBe('Was due ')
    expect(banners[0]?.sublineEmphasis).toBe('1st July 2026')
    expect(banners[0]?.aside).toEqual({
      kind: 'status',
      primary: 'Overdue',
      secondary: '',
    })
  })

  it('keeps team approval visible after a hard stop when reports are still waiting', () => {
    const manager = person({ id: 'm1', reportIds: ['1'] })
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        people: [manager, person({ id: '1', managerId: 'm1' })],
        byPerson: {
          m1: row({
            personId: 'm1',
            status: 'approved',
            goals: [{ id: 'g1', description: 'Grow', weight: 100, measurements: [] }],
          }),
          '1': row({
            personId: '1',
            status: 'submitted',
            goals: [{ id: 'g2', description: 'Ship', weight: 100, measurements: [] }],
          }),
        },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(
      cycle({
        phase: 'hard_lock',
        postWindowGoalPolicy: 'hard_stop',
      }),
    )

    const banners = resolveHomeBanners(
      manager,
      new Date('2026-08-23T12:00:00.000Z'),
    )
    expect(banners.map((banner) => banner.variant)).toEqual(['approve_team_goals'])
    expect(banners[0]?.aside.primary).toBe('Overdue')
  })

  it('shows a closed banner when hard-stop submissions can no longer be filed', () => {
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        byPerson: { '1': row({ personId: '1', status: 'incomplete' }) },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(
      cycle({
        phase: 'hard_lock',
        postWindowGoalPolicy: 'hard_stop',
      }),
    )

    const banners = resolveHomeBanners(
      person(),
      new Date('2026-08-23T12:00:00.000Z'),
    )
    expect(banners[0]?.headline).toBe('Q3 Goal submission is closed')
    expect(banners[0]?.subline).toBe('Was due ')
    expect(banners[0]?.sublineEmphasis).toBe('1st July 2026')
    expect(banners[0]?.aside).toEqual({
      kind: 'status',
      primary: 'Closed',
      secondary: '',
    })
    expect(banners[0]?.ariaLabel).toBe(
      'Q3 Goal submission is closed. Was due 1st July 2026.',
    )
  })

  it('marks progress updates overdue after the employee check-in deadline', () => {
    mockGetGoalsSnapshot.mockReturnValue(
      snapshot({
        byPerson: {
          '1': row({
            status: 'approved',
            goals: [{ id: 'g1', description: 'Ship', weight: 100, measurements: [] }],
          }),
        },
      }),
    )
    mockGetCurrentReviewCycleId.mockReturnValue('q3-2026')
    mockResolveGoalsCycle.mockReturnValue(cycle({ phase: 'check_in' }))
    mockGetReviewCycle.mockReturnValue({
      stagesConfig: {
        performance: {
          employeeEnd: { date: '2026-09-15', time: '14:00' },
        },
      },
    })

    const banners = resolveHomeBanners(
      person(),
      new Date('2026-09-20T12:00:00.000Z'),
    )
    expect(banners[0]?.variant).toBe('update_progress')
    expect(banners[0]?.headline).toBe('Update Goal Progress')
    expect(banners[0]?.timing).toBe('overdue')
    expect(banners[0]?.subline).toBe('Was due ')
    expect(banners[0]?.aside).toEqual({
      kind: 'status',
      primary: 'Overdue',
      secondary: '',
    })
  })
})
