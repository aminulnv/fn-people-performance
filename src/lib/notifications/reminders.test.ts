import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getGoalsSnapshot, getGoalsSnapshotForCycle } from '@/lib/goals/store'
import { listReviewCycles } from '@/lib/reviews/store'
import { evaluateNotificationReminders } from './reminders'
import { getNotificationFeed, resetNotificationsForTests } from './store'

vi.mock('@/lib/goals/store', () => ({
  getGoalsSnapshot: vi.fn(),
  getGoalsSnapshotForCycle: vi.fn(),
}))

vi.mock('@/lib/reviews/store', () => ({
  listReviewCycles: vi.fn(),
}))

const person = {
  id: '1',
  name: 'Ada',
  email: 'ada@example.com',
  joinDate: '2024-01-01',
  managerId: '2',
  reportIds: [] as string[],
}

const cycle = {
  id: 'q3-2026',
  label: 'Q3 2026',
  day1: '2026-07-01T00:00:00.000Z',
  phase: 'check_in' as const,
  status: 'current' as const,
  goalCountPolicy: {
    minimumRequired: 2,
    recommendedMinimum: 3,
    recommendedMaximum: 5,
    maximumAllowed: null,
  },
  postWindowGoalPolicy: 'two_tier_approval' as const,
  goalWindow: {
    startDate: '2026-06-06T00:00:00.000Z',
    endDate: '2026-07-01T00:00:00.000Z',
  },
}

const row = {
  personId: '1',
  status: 'approved' as const,
  goals: [] as [],
}

describe('evaluateNotificationReminders', () => {
  beforeEach(() => {
    localStorage.clear()
    resetNotificationsForTests()
    vi.mocked(getGoalsSnapshot).mockReturnValue({
      cycle,
      cycleStatus: 'current',
      availableCycles: [cycle],
      activePersonId: '1',
      people: [person],
      byPerson: { '1': row },
    } as never)
    vi.mocked(getGoalsSnapshotForCycle).mockReturnValue({
      cycle,
      cycleStatus: 'current',
      availableCycles: [cycle],
      activePersonId: '1',
      people: [person],
      byPerson: { '1': row },
    } as never)
    vi.mocked(listReviewCycles).mockReturnValue([
      {
        id: 'q3-2026',
        name: 'Q3 2026',
        endDate: '2026-09-30T00:00:00.000Z',
      },
    ] as never)
  })

  it('does not throw when cycle dates are API timestamps', () => {
    expect(() =>
      evaluateNotificationReminders('1', new Date('2026-09-20T12:00:00.000Z')),
    ).not.toThrow()
    expect(getNotificationFeed('1').items.length).toBeGreaterThan(0)
  })
})
