import { afterEach, describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  effectiveReportIds,
  isEffectiveDirectReport,
  managerLineRecipientIds,
  possessiveName,
  viewerHasEffectiveReports,
} from './roles'
import {
  assignManagerDelegationLocal,
  resetManagerDelegationsForTests,
} from './store'

afterEach(() => {
  resetManagerDelegationsForTests()
})

function person(
  overrides: Partial<PlatformEmployee> &
    Pick<PlatformEmployee, 'employeeId' | 'fullName'>,
): PlatformEmployee {
  return {
    email: `${overrides.employeeId}@example.com`,
    startDate: '2024-01-01',
    jobTitle: 'Engineer',
    department: 'Product',
    team: 'Core',
    division: 'FundedNext',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC1',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('delegate as temporary line manager', () => {
  it("treats the absent manager's reports as the delegate's reports", () => {
    const manager = person({
      employeeId: 2,
      fullName: 'Line Manager',
    })
    const report = person({
      employeeId: 1,
      fullName: 'Report',
      reportsToId: 2,
      reportsToName: 'Line Manager',
    })
    const delegate = person({
      employeeId: 4,
      fullName: 'Peer Manager',
    })
    assignManagerDelegationLocal({
      absentEmployeeId: 2,
      delegateEmployeeId: 4,
      startsOn: '2020-01-01',
      endsOn: '2030-01-01',
      absentName: manager.fullName,
      delegateName: delegate.fullName,
      assignedByEmployeeId: 9,
      assignedByName: 'Admin',
    })

    const directory = [manager, report, delegate]
    expect(isEffectiveDirectReport(report, delegate, directory)).toBe(true)
    expect(isEffectiveDirectReport(report, manager, directory)).toBe(true)
    expect(isEffectiveDirectReport(delegate, manager, directory)).toBe(false)
    expect(viewerHasEffectiveReports(delegate, directory)).toBe(true)
    expect(managerLineRecipientIds('2')).toEqual(['2', '4'])
    expect(
      effectiveReportIds({ id: '4', reportIds: [] }, [
        { id: '2', reportIds: ['1'] },
        { id: '4', reportIds: [] },
      ]),
    ).toEqual(['1'])
  })

  it('does not clone access when no delegation is active', () => {
    const manager = person({ employeeId: 2, fullName: 'Line Manager' })
    const report = person({
      employeeId: 1,
      fullName: 'Report',
      reportsToId: 2,
    })
    const peer = person({ employeeId: 4, fullName: 'Peer Manager' })
    expect(isEffectiveDirectReport(report, peer, [manager, report, peer])).toBe(
      false,
    )
    expect(managerLineRecipientIds('2')).toEqual(['2'])
  })

  it('builds a possessive title for the assign modal', () => {
    expect(possessiveName('Aminul Islam')).toBe("Aminul Islam's")
    expect(possessiveName('James')).toBe("James'")
  })
})
