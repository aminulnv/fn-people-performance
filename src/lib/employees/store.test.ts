import { afterEach, describe, expect, it } from 'vitest'
import {
  clearEmployees,
  createEmployee,
  getEmployee,
  getEmployeeProfileExtras,
  listEmployees,
  loadEmployeeProfile,
  updateEmployee,
} from './store'

afterEach(() => {
  clearEmployees()
})

describe('employees store', () => {
  it('starts empty', () => {
    expect(listEmployees()).toEqual([])
  })

  it('returns the same list reference until the directory changes', async () => {
    const first = listEmployees()
    expect(listEmployees()).toBe(first)

    expect(
      (
        await createEmployee({
          employeeId: 101,
          fullName: 'Test Person',
          email: 'test.person@nextventures.io',
          startDate: '2026-01-01',
          jobTitle: 'Executive',
          department: 'Product',
          team: 'Core',
          division: 'FundedNext',
          reportsToName: '',
          departmentHeadName: '',
          hrbpName: '',
          jobGrade: 'IC1',
          site: '',
          managerEmail: '',
        })
      ).ok,
    ).toBe(true)

    const afterCreate = listEmployees()
    expect(afterCreate).not.toBe(first)
    expect(listEmployees()).toBe(afterCreate)
  })

  it('creates an employee with numeric id', async () => {
    const result = await createEmployee({
      employeeId: 101,
      fullName: 'Test Person',
      email: 'test.person@nextventures.io',
      startDate: '2026-01-01',
      jobTitle: 'Executive',
      department: 'Product',
      team: 'Core',
      division: 'FundedNext',
      reportsToName: 'Manager Name',
      departmentHeadName: 'Head Name',
      hrbpName: 'HRBP Name',
      jobGrade: 'IC1',
      site: '',
      managerEmail: 'manager@nextventures.io',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.employee.employeeId).toBe(101)
    expect(listEmployees()).toHaveLength(1)
  })

  it('rejects duplicate employee ids', async () => {
    const input = {
      employeeId: 101,
      fullName: 'Test Person',
      email: 'test.person@nextventures.io',
      startDate: '2026-01-01',
      jobTitle: '',
      department: '',
      team: '',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    }
    expect((await createEmployee(input)).ok).toBe(true)
    const second = await createEmployee({
      ...input,
      email: 'other@nextventures.io',
    })
    expect(second.ok).toBe(false)
    if (second.ok) return
    expect(second.error).toMatch(/already exists/i)
  })

  it('updates an employee without changing id', async () => {
    expect(
      (
        await createEmployee({
          employeeId: 202,
          fullName: 'Before Name',
          email: 'before@nextventures.io',
          startDate: '2026-02-01',
          jobTitle: 'Analyst',
          department: 'Ops',
          team: '',
          division: '',
          reportsToName: '',
          departmentHeadName: '',
          hrbpName: '',
          jobGrade: 'IC1',
          site: '',
          managerEmail: '',
        })
      ).ok,
    ).toBe(true)

    const result = await updateEmployee(202, {
      employeeId: 202,
      fullName: 'After Name',
      email: 'after@nextventures.io',
      startDate: '2026-02-01',
      jobTitle: 'Lead',
      department: 'Product',
      team: 'Core',
      division: 'FundedNext',
      reportsToName: 'Manager',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: 'IC2',
      site: '',
      managerEmail: 'manager@nextventures.io',
      isActive: false,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.employee.employeeId).toBe(202)
    expect(result.employee.fullName).toBe('After Name')
    expect(result.employee.isActive).toBe(false)
    expect(getEmployee(202)?.jobTitle).toBe('Lead')
  })

  it('allows changing employee id when unique', async () => {
    expect(
      (
        await createEmployee({
          employeeId: 301,
          fullName: 'Move Me',
          email: 'move.me@nextventures.io',
          startDate: '2026-03-01',
          jobTitle: '',
          department: '',
          team: '',
          division: '',
          reportsToName: '',
          departmentHeadName: '',
          hrbpName: '',
          jobGrade: '',
          site: '',
          managerEmail: '',
        })
      ).ok,
    ).toBe(true)

    const result = await updateEmployee(301, {
      employeeId: 401,
      fullName: 'Move Me',
      email: 'move.me@nextventures.io',
      startDate: '2026-03-01',
      jobTitle: '',
      department: '',
      team: '',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
      isActive: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.employee.employeeId).toBe(401)
    expect(getEmployee(301)).toBeNull()
    expect(getEmployee(401)?.fullName).toBe('Move Me')
  })

  it('builds a profile payload from the subject and related people only', async () => {
    const manager = await createEmployee({
      employeeId: 10,
      fullName: 'Line Manager',
      email: 'manager@nextventures.io',
      startDate: '2020-01-01',
      jobTitle: 'Manager',
      department: 'Product',
      team: 'Core',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    })
    expect(manager.ok).toBe(true)

    const report = await createEmployee({
      employeeId: 11,
      fullName: 'Direct Report',
      email: 'report@nextventures.io',
      startDate: '2024-01-01',
      jobTitle: 'Engineer',
      department: 'Product',
      team: 'Core',
      division: '',
      reportsToName: 'Line Manager',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: 'manager@nextventures.io',
    })
    expect(report.ok).toBe(true)

    await createEmployee({
      employeeId: 12,
      fullName: 'Unrelated Person',
      email: 'other@nextventures.io',
      startDate: '2024-01-01',
      jobTitle: 'Designer',
      department: 'Design',
      team: '',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    })

    const payload = await loadEmployeeProfile(10)
    expect(payload?.employee.employeeId).toBe(10)
    expect(payload?.directReports.map((row) => row.employeeId)).toEqual([11])
    expect(payload?.directoryCount).toBe(3)
    expect(getEmployeeProfileExtras(10)?.managerDirectReportCount).toBe(0)
  })
})
