import { describe, expect, it } from 'vitest'
import {
  buildOwnerOptions,
  cascadeGoal,
  duplicateGoal,
  removeGoal,
  replaceGoal,
  resetGoalProgress,
  resolveGoalOwner,
} from './operations'
import type { DemoPerson, Goal } from './types'

const people: DemoPerson[] = [
  {
    id: 'p1',
    name: 'Ada',
    email: 'ada@example.com',
    title: 'Engineer',
    department: 'Product',
    role: 'employee',
    joinDate: '2025-01-01',
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
    role: 'manager',
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
  progressStatus: 'at_risk',
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
    expect(reset.progressStatus).toBe('on_track')
    expect(reset.measurements[0].id).not.toBe('m1')
    if (reset.measurements[0].kind === 'metric') {
      expect(reset.measurements[0].currentValue).toBe(0)
    }
    if (reset.measurements[1].kind === 'milestone') {
      expect(reset.measurements[1].complete).toBe(false)
    }
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

  it('cascades to a report with a linked source title', () => {
    const copy = cascadeGoal(source, 'p2', { sourceTitle: 'Ship quality' })
    expect(copy.ownerId).toBe('p2')
    expect(copy.linkedGoalLabel).toBe('Ship quality')
    expect(copy.comments).toEqual([])
  })
})
