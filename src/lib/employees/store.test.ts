import { afterEach, describe, expect, it } from 'vitest'
import {
  clearEmployees,
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from './store'

afterEach(() => {
  clearEmployees()
})

describe('employees store', () => {
  it('starts empty', () => {
    expect(listEmployees()).toEqual([])
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
})
