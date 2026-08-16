import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import {
  approveSubmission,
  getGoalsSnapshot,
  resetGoalsDemo,
  savePersonGoals,
  sendBackSubmission,
  setActivePerson,
  setSignedInPerson,
  submitPersonGoals,
  updateGoalProgress,
  type GoalMutationContext,
} from './store'
import type { Goal } from './types'

async function seedDirectory() {
  const manager = await createEmployee({
    employeeId: 2,
    fullName: 'Line Manager',
    email: 'manager@example.com',
    startDate: '2024-01-01',
    jobTitle: 'Manager',
    department: 'People',
    team: '',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: '',
    site: '',
    managerEmail: '',
  })
  if (!manager.ok) throw new Error(manager.error)

  const report = await createEmployee({
    employeeId: 1,
    fullName: 'Aminul Islam Borhan',
    email: 'aminul@example.com',
    startDate: '2026-01-01',
    jobTitle: 'Executive',
    department: 'People',
    team: '',
    division: '',
    reportsToName: 'Line Manager',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: '',
    site: '',
    managerEmail: 'manager@example.com',
  })
  if (!report.ok) throw new Error(report.error)

  const peer = await createEmployee({
    employeeId: 3,
    fullName: 'Peer Person',
    email: 'peer@example.com',
    startDate: '2025-01-01',
    jobTitle: 'Executive',
    department: 'People',
    team: '',
    division: '',
    reportsToName: 'Line Manager',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: '',
    site: '',
    managerEmail: 'manager@example.com',
  })
  if (!peer.ok) throw new Error(peer.error)
}

function firstGoal(goals: Goal[]): Goal {
  const goal = goals[0]
  if (!goal) throw new Error('Expected a seeded goal')
  return goal
}

function ctx(subjectId: string, actorId = subjectId): GoalMutationContext {
  return {
    cycleId: getGoalsSnapshot().cycle.id,
    actorId,
    subjectId,
  }
}

describe('goal snapshot reads', () => {
  beforeEach(async () => {
    localStorage.clear()
    clearEmployees()
    await seedDirectory()
    setSignedInPerson('2')
    resetGoalsDemo()
  })

  afterEach(() => {
    clearEmployees()
  })

  it('does not rewrite storage when the active person is already selected', () => {
    const first = setActivePerson('1')
    const second = setActivePerson('1')
    expect(second.activePersonId).toBe('1')
    expect(second).toBe(first)
    expect(getGoalsSnapshot()).toBe(second)
  })
})

describe('goal approval mutations', () => {
  beforeEach(async () => {
    localStorage.clear()
    clearEmployees()
    await seedDirectory()
    // Manager is signed in so the report seeds as submitted.
    setSignedInPerson('2')
    resetGoalsDemo()
  })

  afterEach(() => {
    clearEmployees()
  })

  it('keeps approved goals approved after progress updates', () => {
    approveSubmission(ctx('1', '2'))
    const row = getGoalsSnapshot().byPerson['1']
    const next = structuredClone(row.goals)
    firstGoal(next).progressStatus = 'at_risk'

    const snapshot = updateGoalProgress(ctx('1', '2'), next)

    expect(snapshot.byPerson['1'].status).toBe('approved')
    expect(firstGoal(snapshot.byPerson['1'].goals).progressStatus).toBe(
      'at_risk',
    )
  })

  it('moves approved goals to pending after a structural edit', () => {
    approveSubmission(ctx('1', '2'))
    const next = structuredClone(getGoalsSnapshot().byPerson['1'].goals)
    firstGoal(next).description = 'A revised goal title'

    const snapshot = savePersonGoals(ctx('1', '2'), next)

    expect(snapshot.byPerson['1'].status).toBe('submitted')
    expect(snapshot.byPerson['1'].managerNote).toBeUndefined()
  })

  it('allows a manager to send approved goals back for revision', () => {
    approveSubmission(ctx('1', '2'))

    const snapshot = sendBackSubmission(ctx('1', '2'), 'Revise the target.')

    expect(snapshot.byPerson['1'].status).toBe('sent_back')
    expect(snapshot.byPerson['1'].sendBackReason).toBe('Revise the target.')
    expect(snapshot.byPerson['1'].sendBackBy).toEqual({
      id: '2',
      name: 'Line Manager',
    })
  })

  it('lets the owner resubmit after a send-back', () => {
    approveSubmission(ctx('1', '2'))
    sendBackSubmission(ctx('1', '2'), 'Revise the target.')

    const snapshot = submitPersonGoals(ctx('1', '1'))

    expect(snapshot.byPerson['1'].status).toBe('submitted')
    expect(snapshot.byPerson['1'].sendBackReason).toBeUndefined()
    expect(snapshot.byPerson['1'].sendBackBy).toBeUndefined()
  })

  it('keeps pending goals pending when progress changes', () => {
    const progress = structuredClone(getGoalsSnapshot().byPerson['1'].goals)
    firstGoal(progress).progressStatus = 'on_hold'

    const snapshot = updateGoalProgress(ctx('1', '2'), progress)

    expect(snapshot.byPerson['1'].status).toBe('submitted')
  })

  it('rejects structural edits through the progress boundary', () => {
    const next = structuredClone(getGoalsSnapshot().byPerson['1'].goals)
    firstGoal(next).description = 'A structural change'

    expect(() => updateGoalProgress(ctx('1', '2'), next)).toThrow(
      'Structural goal changes must use the goal editor.',
    )
  })

  it('rejects mutations from an unauthorized peer', () => {
    const next = structuredClone(getGoalsSnapshot().byPerson['1'].goals)
    firstGoal(next).description = 'Peer edit'

    expect(() => savePersonGoals(ctx('1', '3'), next)).toThrow(
      'You do not have permission to edit these goals.',
    )
  })
})
