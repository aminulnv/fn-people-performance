import { describe, expect, it } from 'vitest'
import { DEFAULT_CYCLE_SETTINGS } from '@/lib/reviews/demoData'
import type { DemoPerson, GoalsCycle, PersonGoals } from '@/lib/goals/types'
import {
  countGoalTodosForPerson,
  countOwnGoalTodos,
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

describe('countGoalTodosForPerson', () => {
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
})

describe('goalTodoBadgeLabel', () => {
  it('names report approvals separately from own attention items', () => {
    expect(goalTodoBadgeLabel(1, 'reports')).toBe('1 awaiting review')
    expect(goalTodoBadgeLabel(1, 'own')).toBe('1 item needs attention')
    expect(goalTodoBadgeLabel(2, 'total')).toBe('2 items need attention')
    expect(goalTodoBadgeLabel(0, 'total')).toBeUndefined()
  })
})
