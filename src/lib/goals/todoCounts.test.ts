import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_CYCLE_SETTINGS } from '@/lib/reviews/demoData'
import type { DemoPerson, GoalsCycle, PersonGoals } from '@/lib/goals/types'
import {
  resetReviewsStoreForTests,
  setReviewsLocalModeForTests,
} from '@/lib/reviews/store'
import {
  countGoalTodosForPerson,
  countOwnGoalTodos,
  countReportGoalTodos,
  goalTodoBadgeLabel,
  totalGoalTodos,
} from './todoCounts'

const cycle: Pick<GoalsCycle, 'goalCountPolicy'> = {
  goalCountPolicy: { ...DEFAULT_CYCLE_SETTINGS.goalCountPolicy },
}

function row(
  partial: Partial<PersonGoals> & Pick<PersonGoals, 'personId' | 'status'>,
): PersonGoals {
  return { goals: [], ...partial }
}

function person(
  partial: Partial<DemoPerson> & Pick<DemoPerson, 'id' | 'name'>,
): DemoPerson {
  return {
    email: `${partial.id}@example.com`,
    title: 'Engineer',
    department: 'Product',
    joinDate: '2025-01-01',
    reportIds: [],
    avatarHue: 1,
    blurb: '',
    ...partial,
  }
}

describe('countOwnGoalTodos', () => {
  it('counts sent-back and action-required as separate items', () => {
    expect(
      countOwnGoalTodos(
        row({
          personId: '1',
          status: 'sent_back',
          sendBackReason: 'Fix the matrix',
        }),
        cycle,
      ),
    ).toBe(2)
  })

  it('counts only action required on a blocked draft', () => {
    expect(
      countOwnGoalTodos(row({ personId: '1', status: 'draft' }), cycle),
    ).toBe(1)
  })

  it('does not count a submitted set waiting on someone else', () => {
    expect(
      countOwnGoalTodos(row({ personId: '1', status: 'submitted' }), cycle),
    ).toBe(0)
  })

  it('skips action required when the viewer cannot submit', () => {
    expect(
      countOwnGoalTodos(
        row({
          personId: '1',
          status: 'sent_back',
          sendBackReason: 'Fix the matrix',
        }),
        cycle,
        { canSubmit: false },
      ),
    ).toBe(1)
  })
})

function snapshotCycle(
  assignedGroupId?: string | null,
): GoalsCycle {
  return {
    id: 'c1',
    label: 'Q3 2026',
    day1: '2026-07-01',
    phase: 'window_open',
    goalCountPolicy: cycle.goalCountPolicy,
    postWindowGoalPolicy: DEFAULT_CYCLE_SETTINGS.postWindowGoalPolicy,
    assignedGroupId,
  }
}

describe('countGoalTodosForPerson', () => {
  afterEach(() => {
    resetReviewsStoreForTests()
  })

  it('adds own warnings to reports awaiting approval', () => {
    const manager = person({ id: 'm1', name: 'Manager', reportIds: ['e1'] })
    const report = person({ id: 'e1', name: 'Report', managerId: 'm1' })
    const counts = countGoalTodosForPerson(manager, {
      cycle: {
        id: 'c1',
        label: 'Q3 2026',
        day1: '2026-07-01',
        phase: 'window_open',
        goalCountPolicy: cycle.goalCountPolicy,
        postWindowGoalPolicy: DEFAULT_CYCLE_SETTINGS.postWindowGoalPolicy,
      },
      people: [manager, report],
      byPerson: {
        m1: row({
          personId: 'm1',
          status: 'sent_back',
          sendBackReason: 'Fix the matrix',
        }),
        e1: row({ personId: 'e1', status: 'submitted' }),
      },
    })

    expect(counts).toEqual({ own: 2, reports: 1 })
    expect(totalGoalTodos(counts)).toBe(3)
  })

  it('counts action required on a report draft the same way as own goals', () => {
    const manager = person({ id: 'm1', name: 'Manager', reportIds: ['e1'] })
    const report = person({ id: 'e1', name: 'Report', managerId: 'm1' })
    const counts = countGoalTodosForPerson(manager, {
      cycle: snapshotCycle('group-1'),
      people: [manager, report],
      byPerson: {
        m1: row({ personId: 'm1', status: 'approved' }),
        e1: row({ personId: 'e1', status: 'draft' }),
      },
    })

    expect(counts).toEqual({ own: 0, reports: 1 })
  })

  it('counts sent-back and blockers on a report the manager can see', () => {
    const manager = person({ id: 'm1', name: 'Manager', reportIds: ['e1'] })
    const report = person({ id: 'e1', name: 'Report', managerId: 'm1' })
    const counts = countGoalTodosForPerson(manager, {
      cycle: snapshotCycle('group-1'),
      people: [manager, report],
      byPerson: {
        m1: row({ personId: 'm1', status: 'approved' }),
        e1: row({
          personId: 'e1',
          status: 'sent_back',
          sendBackReason: 'Fix the matrix',
        }),
      },
    })

    expect(counts).toEqual({ own: 0, reports: 2 })
  })

  it('does not count own action required when the person is outside the cycle', () => {
    const subject = person({ id: '1', name: 'Aminul' })
    const counts = countGoalTodosForPerson(subject, {
      cycle: snapshotCycle(null),
      people: [subject],
      byPerson: {
        '1': row({ personId: '1', status: 'draft' }),
      },
    })

    expect(counts.own).toBe(0)
  })

  it('does not count own action required while review membership is unknown', () => {
    setReviewsLocalModeForTests(false)
    const subject = person({ id: '1', name: 'Aminul' })
    const counts = countGoalTodosForPerson(subject, {
      cycle: snapshotCycle(),
      people: [subject],
      byPerson: {
        '1': row({ personId: '1', status: 'draft' }),
      },
    })

    expect(counts.own).toBe(0)
  })
})

describe('countReportGoalTodos', () => {
  it('adds pending review to the same attention items as My Goals', () => {
    expect(
      countReportGoalTodos(
        [
          { row: row({ personId: 'e1', status: 'submitted' }) },
          { row: row({ personId: 'e2', status: 'draft' }) },
        ],
        snapshotCycle('group-1'),
      ),
    ).toBe(2)
  })

  it('does not treat empty drafts as action required on a future cycle', () => {
    expect(
      countReportGoalTodos(
        [{ row: row({ personId: 'e2', status: 'draft' }) }],
        { ...snapshotCycle('group-1'), phase: 'not_open' },
      ),
    ).toBe(0)
  })
})

describe('goalTodoBadgeLabel', () => {
  it('uses the same attention copy on My Goals and My Reports', () => {
    expect(goalTodoBadgeLabel(1, 'reports')).toBe('1 item needs attention')
    expect(goalTodoBadgeLabel(1, 'own')).toBe('1 item needs attention')
    expect(goalTodoBadgeLabel(2, 'total')).toBe('2 items need attention')
    expect(goalTodoBadgeLabel(0, 'total')).toBeUndefined()
  })
})
