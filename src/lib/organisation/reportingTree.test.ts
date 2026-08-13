import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  buildReportingForest,
  countDescendants,
  findPathToEmployee,
} from './reportingTree'

function employee(
  partial: Partial<PlatformEmployee> &
    Pick<PlatformEmployee, 'employeeId' | 'fullName'>,
): PlatformEmployee {
  return {
    email: `${partial.employeeId}@example.com`,
    startDate: '',
    jobTitle: '',
    department: '',
    team: '',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: '',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...partial,
  }
}

describe('buildReportingForest', () => {
  it('builds a tree from reportsToId', () => {
    const people = [
      employee({ employeeId: 1, fullName: 'CEO' }),
      employee({
        employeeId: 2,
        fullName: 'VP',
        reportsToId: 1,
        reportsToName: 'CEO',
      }),
      employee({
        employeeId: 3,
        fullName: 'IC',
        reportsToId: 2,
        reportsToName: 'VP',
      }),
    ]
    const forest = buildReportingForest(people)
    expect(forest).toHaveLength(1)
    expect(forest[0]?.employee.employeeId).toBe(1)
    expect(forest[0]?.children[0]?.employee.employeeId).toBe(2)
    expect(forest[0]?.children[0]?.children[0]?.employee.employeeId).toBe(3)
    expect(countDescendants(forest[0]!)).toBe(2)
  })

  it('resolves manager by name when id is missing', () => {
    const people = [
      employee({ employeeId: 10, fullName: 'Ada Head' }),
      employee({
        employeeId: 11,
        fullName: 'Bob',
        reportsToName: 'Ada Head',
      }),
    ]
    const forest = buildReportingForest(people)
    expect(forest).toHaveLength(1)
    expect(forest[0]?.children.map((c) => c.employee.employeeId)).toEqual([11])
  })

  it('ignores inactive employees', () => {
    const people = [
      employee({ employeeId: 1, fullName: 'Root' }),
      employee({
        employeeId: 2,
        fullName: 'Gone',
        reportsToId: 1,
        isActive: false,
      }),
    ]
    const forest = buildReportingForest(people)
    expect(forest[0]?.children).toHaveLength(0)
  })

  it('finds path to an employee', () => {
    const people = [
      employee({ employeeId: 1, fullName: 'A' }),
      employee({
        employeeId: 2,
        fullName: 'B',
        reportsToId: 1,
      }),
      employee({
        employeeId: 3,
        fullName: 'C',
        reportsToId: 2,
      }),
    ]
    const forest = buildReportingForest(people)
    expect(findPathToEmployee(forest, 3)).toEqual([1, 2, 3])
    expect(findPathToEmployee(forest, 99)).toEqual([])
  })
})
