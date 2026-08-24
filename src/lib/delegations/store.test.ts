import { afterEach, describe, expect, it } from 'vitest'
import {
  assignManagerDelegationLocal,
  listActiveDelegatedManagerIds,
  listActiveDelegationForEmployee,
  listDelegationsForEmployee,
  resetManagerDelegationsForTests,
  revokeManagerDelegationLocal,
} from './store'

afterEach(() => {
  resetManagerDelegationsForTests()
})

describe('manager delegations store', () => {
  it('treats a current date range as active for the delegate', () => {
    assignManagerDelegationLocal({
      absentEmployeeId: 2,
      delegateEmployeeId: 4,
      startsOn: '2020-01-01',
      endsOn: '2030-01-01',
      absentName: 'Line Manager',
      delegateName: 'Peer Manager',
      assignedByEmployeeId: 1,
      assignedByName: 'Admin',
    })

    expect(listActiveDelegatedManagerIds('4')).toEqual(['2'])
    expect(listActiveDelegationForEmployee(2)?.delegateName).toBe(
      'Peer Manager',
    )
    expect(listDelegationsForEmployee(2)[0]?.status).toBe('active')
  })

  it('does not let a manager delegate to themselves', () => {
    expect(() =>
      assignManagerDelegationLocal({
        absentEmployeeId: 2,
        delegateEmployeeId: 2,
        startsOn: '2026-01-01',
        endsOn: '2026-01-15',
        absentName: 'Line Manager',
        delegateName: 'Line Manager',
        assignedByEmployeeId: 1,
        assignedByName: 'Admin',
      }),
    ).toThrow(/themselves/)
  })

  it('revokes so the delegate no longer receives that queue', () => {
    const delegation = assignManagerDelegationLocal({
      absentEmployeeId: 2,
      delegateEmployeeId: 4,
      startsOn: '2020-01-01',
      endsOn: '2030-01-01',
      absentName: 'Line Manager',
      delegateName: 'Peer Manager',
      assignedByEmployeeId: 1,
      assignedByName: 'Admin',
    })

    revokeManagerDelegationLocal(delegation.id)

    expect(listActiveDelegatedManagerIds('4')).toEqual([])
    expect(listActiveDelegationForEmployee(2)).toBeUndefined()
  })
})
