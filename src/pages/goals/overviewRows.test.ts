import { describe, expect, it } from 'vitest'
import type { DemoPerson, GoalsSnapshot, PersonGoals } from '@/lib/goals/types'
import {
  describeEmptyGoalsList,
  goalRows,
  peopleWithoutGoals,
  statusCounts,
  withOwnerRowSpans,
} from './overviewRows'

function person(id: string, overrides: Partial<DemoPerson> = {}): DemoPerson {
  return {
    id,
    name: `Person ${id}`,
    email: `person${id}@example.com`,
    title: 'Engineer',
    department: 'Engineering',
    joinDate: '2020-01-01',
    reportIds: [],
    avatarHue: 0,
    blurb: '',
    ...overrides,
  }
}

function submission(
  personId: string,
  status: PersonGoals['status'],
  goalCount: number,
): PersonGoals {
  return {
    personId,
    status,
    version: 1,
    goals: Array.from({ length: goalCount }, (_, index) => ({
      id: `${personId}-goal-${index}`,
      ownerId: personId,
      description: `Goal ${index}`,
      weight: 50,
      measurements: [],
      comments: [],
    })),
  }
}

function snapshotOf(people: DemoPerson[], rows: PersonGoals[]): GoalsSnapshot {
  return {
    cycle: {
      id: 'q3-2026',
      label: 'Q3 2026',
      day1: '2026-07-01',
      phase: 'window_open',
      goalCountPolicy: {
        recommendedMinimum: 3,
        recommendedMaximum: 5,
        hardMaximum: 8,
      },
      postWindowGoalPolicy: 'two_tier_approval',
      goalWindow: { opensOn: '2026-07-01', closesOn: '2026-07-15' },
    },
    cycleStatus: 'current',
    availableCycles: [],
    activePersonId: people[0]?.id ?? '',
    people,
    byPerson: Object.fromEntries(rows.map((row) => [row.personId, row])),
  } as GoalsSnapshot
}

describe('withOwnerRowSpans', () => {
  it('merges consecutive rows from the same person', () => {
    const people = [person('1'), person('2')]
    const snapshot = snapshotOf(people, [
      submission('1', 'approved', 2),
      submission('2', 'draft', 1),
    ])
    const rows = goalRows(snapshot, people)

    expect(
      withOwnerRowSpans(rows).map((row) => [row.ownerRowSpan, row.isPersonEnd]),
    ).toEqual([
      [2, false],
      [0, true],
      [1, true],
    ])
  })

  it('grows the owner span to cover expanded measure rows', () => {
    const people = [person('1')]
    const snapshot = snapshotOf(people, [submission('1', 'approved', 2)])
    snapshot.byPerson['1'].goals[0].measurements = [
      {
        id: 'm1',
        kind: 'metric',
        title: 'Defects closed',
        weight: 100,
        unit: 'number',
        direction: 'increase',
        startValue: 0,
        currentValue: 10,
        targetValue: 80,
      },
    ]
    snapshot.byPerson['1'].goals[1].measurements = [
      {
        id: 'm2',
        kind: 'metric',
        title: 'Milestones',
        weight: 100,
        unit: 'number',
        direction: 'increase',
        startValue: 0,
        currentValue: 4,
        targetValue: 10,
      },
    ]
    const rows = goalRows(snapshot, people)
    const expanded = new Set([`${snapshot.cycle.id}:${rows[0].goalId}`])

    expect(
      withOwnerRowSpans(rows, expanded).map((row) => row.ownerRowSpan),
    ).toEqual([3, 0])
  })
})

describe('goalRows', () => {
  it('omits people who have no goals', () => {
    const people = [person('1'), person('2')]
    const snapshot = snapshotOf(people, [
      submission('1', 'approved', 2),
      submission('2', 'draft', 0),
    ])

    expect(goalRows(snapshot, people).map((row) => row.person.id)).toEqual([
      '1',
      '1',
    ])
  })

  it('carries cascade source onto rows that came from a manager goal', () => {
    const people = [person('1')]
    const snapshot = snapshotOf(people, [submission('1', 'draft', 1)])
    snapshot.byPerson['1'].goals[0] = {
      ...snapshot.byPerson['1'].goals[0],
      cascadedFromGoalId: 'mgr-1',
      linkedGoalLabel: 'Raise quality bar',
    }

    expect(goalRows(snapshot, people)[0]).toMatchObject({
      cycleId: 'q3-2026',
      cycleLabel: 'Q3 2026',
      cascadedFromGoalId: 'mgr-1',
      linkedGoalLabel: 'Raise quality bar',
      cascadedTo: [],
    })
  })

  it('lists who already received a copy of a source goal', () => {
    const people = [person('1'), person('2')]
    const snapshot = snapshotOf(people, [
      submission('1', 'approved', 1),
      submission('2', 'draft', 1),
    ])
    snapshot.byPerson['2'].goals[0] = {
      ...snapshot.byPerson['2'].goals[0],
      cascadedFromGoalId: snapshot.byPerson['1'].goals[0].id,
      linkedGoalLabel: 'Goal 0',
    }

    expect(goalRows(snapshot, people)[0].cascadedTo).toEqual([
      expect.objectContaining({
        personName: 'Person 2',
        personId: '2',
        goalId: '2-goal-0',
      }),
    ])
  })

  it('flags a draft goal that still needs a measure', () => {
    const people = [person('1')]
    const snapshot = snapshotOf(people, [submission('1', 'draft', 1)])
    snapshot.byPerson['1'].goals[0] = {
      ...snapshot.byPerson['1'].goals[0],
      description: 'test',
      measurements: [],
    }

    expect(goalRows(snapshot, people)[0].issue).toBe(
      'test still needs a metric.',
    )
  })

  it('does not flag approved goals even when a measure is missing', () => {
    const people = [person('1')]
    const snapshot = snapshotOf(people, [submission('1', 'approved', 1)])

    expect(goalRows(snapshot, people)[0].issue).toBeUndefined()
  })
})

describe('statusCounts', () => {
  it('counts goals per goal and statuses per person', () => {
    const people = [person('1'), person('2'), person('3')]
    const snapshot = snapshotOf(people, [
      submission('1', 'approved', 3),
      submission('2', 'draft', 0),
      submission('3', 'submitted', 1),
    ])

    expect(statusCounts(snapshot, people)).toEqual({
      goals: 4,
      draft: 1,
      sentBack: 0,
      submitted: 1,
      approved: 1,
      incomplete: 0,
    })
  })
})

describe('peopleWithoutGoals', () => {
  it('respects the active status filter', () => {
    const people = [person('1'), person('2'), person('3')]
    const snapshot = snapshotOf(people, [
      submission('1', 'draft', 0),
      submission('2', 'incomplete', 0),
      submission('3', 'draft', 2),
    ])

    expect(
      peopleWithoutGoals(snapshot, people, 'draft').map((row) => row.id),
    ).toEqual(['1'])
  })
})

describe('describeEmptyGoalsList', () => {
  it('invites the viewer to add a goal on their own empty scope', () => {
    const result = describeEmptyGoalsList({
      scope: 'mine',
      peopleInScope: 1,
      waitingPeople: 1,
      hasQuery: false,
      statusFilter: null,
      canAddOwnGoals: true,
    })

    expect(result.title).toBe('No goals yet')
    expect(result.description).toBe('Add your first goal for this cycle.')
    expect(result.offerAdd).toBe(true)
  })

  it('reports how many people are still waiting behind a status filter', () => {
    const result = describeEmptyGoalsList({
      scope: 'all',
      peopleInScope: 22,
      waitingPeople: 22,
      hasQuery: false,
      statusFilter: 'draft',
      canAddOwnGoals: true,
    })

    expect(result.description).toBe(
      '22 people in this scope are in draft but have not added any goals yet.',
    )
    expect(result.offerAdd).toBe(false)
  })

  it('does not offer to add goals when the cycle is locked', () => {
    const result = describeEmptyGoalsList({
      scope: 'mine',
      peopleInScope: 1,
      waitingPeople: 1,
      hasQuery: false,
      statusFilter: null,
      canAddOwnGoals: false,
    })

    expect(result.offerAdd).toBe(false)
    expect(result.description).toBe(
      'Goals cannot be added for this cycle right now.',
    )
  })
})
