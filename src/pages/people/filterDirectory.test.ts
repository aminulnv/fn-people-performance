import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  compareDirectoryRows,
  directoryStats,
  employeeSearchHaystack,
  filterDirectory,
} from './filterDirectory'

function person(
  overrides: Partial<PlatformEmployee> & Pick<PlatformEmployee, 'employeeId' | 'fullName'>,
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

const manager = person({
  employeeId: 1,
  fullName: 'Ada Manager',
  department: 'Product',
})

const report = person({
  employeeId: 2,
  fullName: 'Bilal Report',
  department: 'Product',
  reportsToId: 1,
  reportsToName: 'Ada Manager',
})

const otherDept = person({
  employeeId: 3,
  fullName: 'Cara Finance',
  department: 'Finance',
  jobTitle: 'Analyst',
  isActive: false,
})

describe('directoryStats', () => {
  it('counts people, activity, and unique org labels', () => {
    expect(directoryStats([manager, report, otherDept])).toEqual({
      total: 3,
      active: 2,
      inactive: 1,
      departments: 2,
      teams: 1,
    })
  })
})

describe('filterDirectory', () => {
  const people = [otherDept, report, manager]

  it('sorts by department then name, leaving blank departments last', () => {
    const blank = person({
      employeeId: 4,
      fullName: 'Zed Blank',
      department: '',
    })
    expect(
      filterDirectory([...people, blank], {
        query: '',
        scope: 'all',
        statusFilter: null,
        me: manager,
      }).map((row) => row.employeeId),
    ).toEqual([3, 1, 2, 4])
  })

  it('filters my reports and my department', () => {
    expect(
      filterDirectory(people, {
        query: '',
        scope: 'reports',
        statusFilter: null,
        me: manager,
      }).map((row) => row.employeeId),
    ).toEqual([2])

    expect(
      filterDirectory(people, {
        query: '',
        scope: 'department',
        statusFilter: null,
        me: manager,
      }).map((row) => row.employeeId),
    ).toEqual([1, 2])
  })

  it('uses a precomputed haystack so search does not rebuild strings', () => {
    const haystacks = new Map(
      people.map((row) => [row.employeeId, employeeSearchHaystack(row)]),
    )
    expect(
      filterDirectory(people, {
        query: 'finance',
        scope: 'all',
        statusFilter: 'inactive',
        me: manager,
        haystacks,
      }).map((row) => row.fullName),
    ).toEqual(['Cara Finance'])
  })
})

describe('compareDirectoryRows', () => {
  it('keeps names stable inside the same department', () => {
    expect(compareDirectoryRows(manager, report)).toBeLessThan(0)
  })
})
