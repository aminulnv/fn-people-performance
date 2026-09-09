import { beforeEach, describe, expect, it } from 'vitest'
import {
  actingApprover,
  approverDisplayName,
} from './actingApprover'
import {
  assignManagerDelegationLocal,
  resetManagerDelegationsForTests,
} from './store'

beforeEach(() => {
  resetManagerDelegationsForTests()
})

describe('actingApprover', () => {
  it('keeps the org-chart manager when nobody is delegated', () => {
    expect(
      actingApprover({
        id: '2',
        name: 'Aminul',
        avatarUrl: '/aminul.png',
      }),
    ).toEqual({
      id: '2',
      name: 'Aminul',
      avatarUrl: '/aminul.png',
    })
  })

  it('names the delegate while an active cover is in place', () => {
    assignManagerDelegationLocal({
      absentEmployeeId: 2,
      delegateEmployeeId: 4,
      startsOn: '2020-01-01',
      endsOn: '2099-12-31',
      delegateName: 'Fahim',
      delegateAvatarUrl: '/fahim.png',
      absentName: 'Aminul',
      assignedByEmployeeId: 1,
      assignedByName: 'Admin',
    })

    expect(
      actingApprover({
        id: '2',
        name: 'Aminul',
        avatarUrl: '/aminul.png',
      }),
    ).toEqual({
      id: '4',
      name: 'Fahim',
      avatarUrl: '/fahim.png',
      delegated: true,
    })
    expect(
      approverDisplayName({ name: 'Fahim', delegated: true }),
    ).toBe('Fahim (Delegated)')
  })
})
