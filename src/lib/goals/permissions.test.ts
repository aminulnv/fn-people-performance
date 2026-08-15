import { describe, expect, it } from 'vitest'
import {
  deriveGoalCapabilities,
  isDirectManager,
  orderManagerReports,
  selectManagerReports,
} from './permissions'
import type {
  DemoPerson,
  GoalsCycle,
  PersonGoals,
} from './types'

const cycle: GoalsCycle = {
  id: 'c1',
  label: 'Q3 2026',
  day1: '2026-07-01',
  phase: 'window_open',
}

function person(
  partial: Partial<DemoPerson> & Pick<DemoPerson, 'id' | 'name'>,
): DemoPerson {
  return {
    email: `${partial.id}@example.com`,
    title: 'Engineer',
    department: 'Product',
    role: 'employee',
    joinDate: '2025-01-01',
    reportIds: [],
    avatarHue: 1,
    blurb: '',
    ...partial,
  }
}

function row(
  personId: string,
  status: PersonGoals['status'] = 'draft',
): PersonGoals {
  return { personId, status, goals: [] }
}

describe('isDirectManager', () => {
  it('matches managerId or reportIds', () => {
    const manager = person({ id: 'm1', name: 'Manager', reportIds: ['e1'] })
    const report = person({ id: 'e1', name: 'Report', managerId: 'm1' })
    const peer = person({ id: 'e2', name: 'Peer' })
    expect(isDirectManager(manager, report)).toBe(true)
    expect(isDirectManager(manager, peer)).toBe(false)
  })
})

describe('deriveGoalCapabilities', () => {
  const actor = person({
    id: 'm1',
    name: 'Manager',
    role: 'manager',
    reportIds: ['e1'],
  })
  const subject = person({ id: 'e1', name: 'Report', managerId: 'm1' })

  it('lets a manager edit a report on the current open cycle', () => {
    const caps = deriveGoalCapabilities({
      actor,
      subject,
      row: row('e1', 'draft'),
      cycle,
      cycleStatus: 'current',
    })
    expect(caps.canEditStructure).toBe(true)
    expect(caps.canUpdateProgress).toBe(true)
    expect(caps.canApprove).toBe(false)
  })

  it('lets a manager approve submitted goals', () => {
    const caps = deriveGoalCapabilities({
      actor,
      subject,
      row: row('e1', 'submitted'),
      cycle,
      cycleStatus: 'current',
    })
    expect(caps.canApprove).toBe(true)
    expect(caps.canSendBack).toBe(true)
  })

  it('blocks structural edits on previous cycles', () => {
    const caps = deriveGoalCapabilities({
      actor: subject,
      subject,
      row: row('e1', 'draft'),
      cycle,
      cycleStatus: 'previous',
    })
    expect(caps.canEditStructure).toBe(false)
    expect(caps.canUpdateProgress).toBe(false)
  })

  it('does not grant peer edit rights from a forged subject role', () => {
    const peer = person({ id: 'e2', name: 'Peer', role: 'manager' })
    const caps = deriveGoalCapabilities({
      actor: peer,
      subject,
      row: row('e1', 'draft'),
      cycle,
      cycleStatus: 'current',
    })
    expect(caps.canEditStructure).toBe(false)
    expect(caps.canApprove).toBe(false)
  })

  it('only allows cascade for the actor editing their own goals with reports', () => {
    const capsSelf = deriveGoalCapabilities({
      actor,
      subject: actor,
      row: row('m1', 'draft'),
      cycle,
      cycleStatus: 'current',
    })
    const capsReport = deriveGoalCapabilities({
      actor,
      subject,
      row: row('e1', 'draft'),
      cycle,
      cycleStatus: 'current',
    })
    expect(capsSelf.canCascade).toBe(true)
    expect(capsReport.canCascade).toBe(false)
  })
})

describe('selectManagerReports', () => {
  it('returns only the actor direct reports', () => {
    const actor = person({ id: 'm1', name: 'Manager', reportIds: ['e1'] })
    const e1 = person({ id: 'e1', name: 'One', managerId: 'm1' })
    const e2 = person({ id: 'e2', name: 'Two' })
    const reports = selectManagerReports(
      actor,
      [actor, e1, e2],
      { e1: row('e1', 'submitted'), e2: row('e2', 'draft') },
    )
    expect(reports).toHaveLength(1)
    expect(reports[0].person.id).toBe('e1')
  })

  it('orders pending reports first', () => {
    const ordered = orderManagerReports([
      { row: row('a', 'draft') },
      { row: row('b', 'submitted') },
      { row: row('c', 'approved') },
    ])
    expect(ordered.map((item) => item.row.personId)).toEqual(['b', 'a', 'c'])
  })
})
