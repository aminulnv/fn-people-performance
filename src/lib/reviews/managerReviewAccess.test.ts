import { afterEach, describe, expect, it } from 'vitest'
import {
  assignManagerDelegationLocal,
  resetManagerDelegationsForTests,
} from '@/lib/delegations/store'
import type { PlatformEmployee } from '@/lib/employees/types'
import { canWriteManagerReview } from './managerReviewAccess'

function person(
  partial: Partial<PlatformEmployee> & { employeeId: number },
): PlatformEmployee {
  return {
    fullName: 'Pat',
    email: 'pat@example.com',
    startDate: '2024-01-01',
    jobTitle: 'Engineer',
    department: 'Product',
    team: 'Core',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC2',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  }
}

const manager = person({ employeeId: 1, fullName: 'Alex' })
const report = person({
  employeeId: 2,
  fullName: 'Riley',
  reportsToId: 1,
})
const colleague = person({ employeeId: 9, fullName: 'Casey' })

describe('canWriteManagerReview', () => {
  afterEach(() => {
    resetManagerDelegationsForTests()
  })

  it('lets the reporting manager write', () => {
    expect(
      canWriteManagerReview({
        viewerEmployeeId: 1,
        subjectEmployeeId: 2,
        subject: report,
        directory: [manager, report, colleague],
      }),
    ).toBe(true)
  })

  it('lets the person covering the real manager write during the window', () => {
    assignManagerDelegationLocal({
      absentEmployeeId: 1,
      delegateEmployeeId: 9,
      startsOn: '2020-01-01T00:00:00.000Z',
      endsOn: '2099-01-01T00:00:00.000Z',
      absentName: 'Alex',
      delegateName: 'Casey',
      assignedByEmployeeId: 1,
      assignedByName: 'Alex',
    })
    expect(
      canWriteManagerReview({
        viewerEmployeeId: 9,
        subjectEmployeeId: 2,
        subject: report,
        directory: [manager, report, colleague],
      }),
    ).toBe(true)
  })

  it('does not let a former reviewer write if they are not the real manager', () => {
    expect(
      canWriteManagerReview({
        viewerEmployeeId: 1,
        subjectEmployeeId: 2,
        subject: person({ employeeId: 2, reportsToId: 8 }),
        directory: [manager, report, colleague],
      }),
    ).toBe(false)
  })

  it('lets All read + write access write someone else’s review', () => {
    expect(
      canWriteManagerReview({
        viewerEmployeeId: 9,
        subjectEmployeeId: 2,
        subject: report,
        directory: [manager, report, colleague],
        permissions: ['platform.write_all'],
      }),
    ).toBe(true)
  })

  it('does not let All read access or a colleague write', () => {
    expect(
      canWriteManagerReview({
        viewerEmployeeId: 9,
        subjectEmployeeId: 2,
        subject: report,
        directory: [manager, report, colleague],
        permissions: ['platform.read_all'],
      }),
    ).toBe(false)
  })

  it('does not let someone write their own manager review', () => {
    expect(
      canWriteManagerReview({
        viewerEmployeeId: 2,
        subjectEmployeeId: 2,
        permissions: ['platform.write_all'],
      }),
    ).toBe(false)
  })
})
