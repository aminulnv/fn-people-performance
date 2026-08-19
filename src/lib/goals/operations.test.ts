import { describe, expect, it } from 'vitest'
import {
  buildOwnerOptions,
  cascadeGoal,
  cascadeRecipients,
  copyGoalToNewCycle,
  duplicateGoal,
  lineManagerCascade,
  removeGoal,
  replaceGoal,
  resetGoalProgress,
  resolveGoalOwner,
  selectedCascadeOption,
} from './operations'
import type { DemoPerson, Goal } from './types'

const people: DemoPerson[] = [
  {
    id: 'p1',
    name: 'Ada',
    email: 'ada@example.com',
    title: 'Engineer',
    department: 'Product',
    joinDate: '2025-01-01',
    managerId: 'p2',
    reportIds: [],
    avatarHue: 1,
    blurb: '',
  },
  {
    id: 'p2',
    name: 'Ben',
    email: 'ben@example.com',
    title: 'Manager',
    department: 'Product',
    joinDate: '2024-01-01',
    reportIds: ['p1'],
    avatarHue: 2,
    blurb: '',
  },
]

const source: Goal = {
  id: 'g1',
  description: 'Ship quality',
  weight: 40,
  ownerId: 'p1',
  comments: [
    {
      id: 'c1',
      authorName: 'Ada',
      text: 'Note',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  measurements: [
    {
      id: 'm1',
      kind: 'metric',
      title: 'Defects',
      weight: 100,
      unit: 'number',
      direction: 'increase',
      startValue: 0,
      targetValue: 80,
      currentValue: 50,
      progressLog: [
        {
          id: 'log-1',
          recordedAt: '2026-08-01T00:00:00.000Z',
          authorName: 'Ada',
          from: 0,
          to: 50,
        },
      ],
    },
    {
      id: 'm2',
      kind: 'milestone',
      title: 'Triage daily',
      weight: 0,
      complete: true,
    },
  ],
}

describe('resolveGoalOwner', () => {
  it('resolves ownerId against the directory', () => {
    expect(resolveGoalOwner(source, people[0], people)).toMatchObject({
      id: 'p1',
      name: 'Ada',
    })
  })

  it('falls back to the subject when ownerId is unset', () => {
    const goal = { ...source, ownerId: undefined }
    expect(resolveGoalOwner(goal, people[1], people).id).toBe('p2')
  })

  it('keeps a former-owner placeholder when the id is missing', () => {
    const goal = { ...source, ownerId: 'gone' }
    expect(resolveGoalOwner(goal, people[0], people)).toEqual({
      id: 'gone',
      name: 'Former owner',
    })
  })
})

describe('buildOwnerOptions', () => {
  it('sorts people by name', () => {
    expect(buildOwnerOptions(people).map((person) => person.id)).toEqual([
      'p1',
      'p2',
    ])
  })
})

describe('replaceGoal / removeGoal', () => {
  it('replaces and removes immutably', () => {
    const next = { ...source, description: 'Updated' }
    expect(replaceGoal([source], next)[0].description).toBe('Updated')
    expect(removeGoal([source], 'g1')).toEqual([])
  })
})

describe('resetGoalProgress', () => {
  it('clears progress, comments, and regenerates ids', () => {
    const reset = resetGoalProgress(source)
    expect(reset.id).not.toBe(source.id)
    expect(reset.comments).toEqual([])
    expect(reset.measurements[0].id).not.toBe('m1')
    if (reset.measurements[0].kind === 'metric') {
      expect(reset.measurements[0].currentValue).toBe(0)
      expect(reset.measurements[0].progressLog).toEqual([])
    }
    if (reset.measurements[1].kind === 'milestone') {
      expect(reset.measurements[1].complete).toBe(false)
      expect(reset.measurements[1].progressLog).toEqual([])
    }
  })
})

describe('copyGoalToNewCycle', () => {
  it('creates an independent draft without old progress or cascade links', () => {
    const copy = copyGoalToNewCycle(
      {
        ...source,
        cascadedFromGoalId: 'old-parent',
        linkedGoalLabel: 'Old manager goal',
      },
      'p2',
    )

    expect(copy.description).toBe(source.description)
    expect(copy.ownerId).toBe('p2')
    expect(copy.comments).toEqual([])
    expect(copy.cascadedFromGoalId).toBeUndefined()
    expect(copy.linkedGoalLabel).toBeUndefined()
    expect(copy.measurements[0]).toMatchObject({
      currentValue: 0,
      progressLog: [],
    })
  })
})

describe('duplicateGoal / cascadeGoal', () => {
  it('duplicates with a copy label and reset progress', () => {
    const copy = duplicateGoal(source, {
      ownerId: 'p1',
      sourceTitle: 'Ship quality',
    })
    expect(copy.description).toBe('Ship quality (copy)')
    expect(copy.ownerId).toBe('p1')
    expect(copy.comments).toEqual([])
  })

  it('creates a child goal linked to the parent without copying the title', () => {
    const child = cascadeGoal(source, 'p2', {
      sourceTitle: 'Ship quality',
      sourcePersonName: 'Ada',
    })
    expect(child.ownerId).toBe('p2')
    expect(child.description).toBe('Untitled Cascading Goal from Ada')
    expect(child.details).toBeUndefined()
    expect(child.cascadedFromGoalId).toBe('g1')
    expect(child.linkedGoalLabel).toBe('Ship quality')
    expect(child.comments).toEqual([])
    expect(child.measurements).toEqual([])
    expect(child.weight).toBe(0)
  })
})

describe('lineManagerCascade', () => {
  const snapshot = {
    people,
    byPerson: {
      p2: {
        personId: 'p2',
        status: 'approved' as const,
        goals: [source],
      },
    },
  }

  it('lists only the line manager’s goals', () => {
    const result = lineManagerCascade(people[0], snapshot)
    expect(result.managerName).toBe('Ben')
    expect(result.managerId).toBe('p2')
    expect(result.skipLevelManagerName).toBeNull()
    expect(result.options).toEqual([
      {
        id: 'g1',
        title: 'Ship quality',
        managerName: 'Ben',
        managerId: 'p2',
        managerAvatarUrl: undefined,
      },
    ])
  })

  it('resolves the skip-level manager when the line manager has one', () => {
    const withSkipLevel = {
      people: [
        people[0],
        {
          ...people[1],
          managerId: 'p0',
        },
        {
          id: 'p0',
          name: 'Senior',
          email: 'senior@example.com',
          title: 'Director',
          department: 'Product',
          joinDate: '2020-01-01',
          reportIds: ['p2'],
          avatarHue: 0,
          blurb: '',
        },
      ],
      byPerson: snapshot.byPerson,
    }
    const result = lineManagerCascade(people[0], withSkipLevel)
    expect(result.skipLevelManagerId).toBe('p0')
    expect(result.skipLevelManagerName).toBe('Senior')
  })

  it('is empty at the top of the tree', () => {
    expect(lineManagerCascade(people[1], snapshot)).toEqual({
      managerName: null,
      options: [],
    })
  })

  it('lists people who already received a cascaded copy', () => {
    const copy = cascadeGoal(source, 'p1', {
      sourceTitle: 'Ship quality',
      sourcePersonName: 'Ben',
    })
    expect(
      cascadeRecipients('g1', {
        people,
        byPerson: {
          p1: { personId: 'p1', status: 'draft', goals: [copy] },
          p2: { personId: 'p2', status: 'approved', goals: [source] },
        },
      }),
    ).toEqual([
      {
        goalId: copy.id,
        goalTitle: 'Untitled Cascading Goal from Ben',
        personId: 'p1',
        personName: 'Ada',
        avatarUrl: undefined,
      },
    ])
  })

  it('uses the child’s current title after the recipient renames it', () => {
    const copy = {
      ...cascadeGoal(source, 'p1', {
        sourceTitle: 'Ship quality',
        sourcePersonName: 'Ben',
      }),
      description: 'Cut defects in my team',
    }
    expect(
      cascadeRecipients('g1', {
        people,
        byPerson: {
          p1: { personId: 'p1', status: 'draft', goals: [copy] },
          p2: { personId: 'p2', status: 'approved', goals: [source] },
        },
      }),
    ).toEqual([
      {
        goalId: copy.id,
        goalTitle: 'Cut defects in my team',
        personId: 'p1',
        personName: 'Ada',
        avatarUrl: undefined,
      },
    ])
  })

  it('resolves a cascade by id, then by title', () => {
    const options = lineManagerCascade(people[0], snapshot).options
    expect(
      selectedCascadeOption({ cascadedFromGoalId: 'g1' }, options)?.title,
    ).toBe('Ship quality')
    expect(
      selectedCascadeOption({ linkedGoalLabel: 'Ship quality' }, options)?.id,
    ).toBe('g1')
  })
})
