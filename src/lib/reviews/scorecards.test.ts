import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import { buildEmployeeScorecardHistory } from './scorecards'
import { listReviewCycles } from './store'

function employee(partial: Partial<PlatformEmployee> & { employeeId: number }): PlatformEmployee {
  return {
    fullName: 'Pat Example',
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

describe('buildEmployeeScorecardHistory', () => {
  it('builds one row per cycle without scanning every employee', () => {
    const subject = employee({ employeeId: 7 })
    const rows = buildEmployeeScorecardHistory(subject, [subject])

    expect(rows.length).toBe(listReviewCycles().length)
    expect(rows.every((row) => row.employeeId === 7)).toBe(true)
  })
})
