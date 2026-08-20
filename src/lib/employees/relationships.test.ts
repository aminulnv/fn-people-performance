import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildOrganisationFromEmployees } from '@/lib/organisation/fromEmployees'
import {
  listMemoryEmployees,
  replaceMemoryEmployees,
} from './memoryStore'
import { resolveTeamOwner } from './relationships'
import { clearEmployees, createEmployee, getEmployee } from './store'
import type { PlatformTeam } from './types'

const ownerInput = {
  employeeId: 5,
  fullName: 'Angie Rahman',
  email: 'angie@example.com',
  startDate: '2018-01-01',
  jobTitle: 'Team Lead',
  department: 'Product',
  team: 'PTR',
  division: '',
  reportsToName: '',
  departmentHeadName: '',
  hrbpName: '',
  jobGrade: '',
  site: '',
  managerEmail: '',
}

const memberInput = {
  employeeId: 1,
  fullName: 'Test Employee',
  email: 'employee@example.com',
  startDate: '2024-01-01',
  jobTitle: 'Engineer',
  department: 'Product',
  team: 'PTR',
  division: '',
  reportsToName: '',
  departmentHeadName: '',
  hrbpName: '',
  jobGrade: '',
  site: '',
  managerEmail: '',
}

function assignTeamOwner(
  employeeId: number,
  owner: { employeeId: number; fullName: string },
) {
  replaceMemoryEmployees(
    listMemoryEmployees().map((person) =>
      person.employeeId === employeeId
        ? {
            ...person,
            teamOwnerId: owner.employeeId,
            teamOwnerName: owner.fullName,
          }
        : person,
    ),
  )
}

function ptrTeam(owner: { employeeId: number; fullName: string }): PlatformTeam {
  return {
    id: 9,
    name: 'PTR',
    departmentId: 2,
    departmentName: 'Product',
    ownerEmployeeId: owner.employeeId,
    ownerName: owner.fullName,
    ownerEmail: null,
    headcount: 2,
  }
}

describe('resolveTeamOwner', () => {
  beforeEach(() => {
    clearEmployees()
  })

  afterEach(() => {
    clearEmployees()
  })

  it('returns null when the employee has no team owner', async () => {
    const result = await createEmployee(memberInput)
    if (!result.ok) throw new Error(result.error)

    expect(resolveTeamOwner(result.employee)).toBeNull()
  })

  it('resolves the team owner by id', async () => {
    const owner = await createEmployee(ownerInput)
    const member = await createEmployee(memberInput)
    if (!owner.ok) throw new Error(owner.error)
    if (!member.ok) throw new Error(member.error)

    assignTeamOwner(member.employee.employeeId, owner.employee)

    const stored = getEmployee(member.employee.employeeId)
    expect(resolveTeamOwner(stored)?.employeeId).toBe(owner.employee.employeeId)
    expect(resolveTeamOwner(stored)?.fullName).toBe('Angie Rahman')
  })

  it('falls back to the owner name when the id is missing', async () => {
    const owner = await createEmployee(ownerInput)
    const member = await createEmployee(memberInput)
    if (!owner.ok) throw new Error(owner.error)
    if (!member.ok) throw new Error(member.error)

    replaceMemoryEmployees(
      listMemoryEmployees().map((person) =>
        person.employeeId === member.employee.employeeId
          ? { ...person, teamOwnerName: owner.employee.fullName }
          : person,
      ),
    )

    expect(
      resolveTeamOwner(getEmployee(member.employee.employeeId))?.employeeId,
    ).toBe(owner.employee.employeeId)
  })

  it('resolves the owner from the teams catalog when the employee payload omits it', async () => {
    const owner = await createEmployee(ownerInput)
    const member = await createEmployee(memberInput)
    if (!owner.ok) throw new Error(owner.error)
    if (!member.ok) throw new Error(member.error)

    expect(
      resolveTeamOwner(getEmployee(member.employee.employeeId), {
        teams: [ptrTeam(owner.employee)],
      })?.fullName,
    ).toBe('Angie Rahman')
  })

  it('falls back to the organisation team manager', async () => {
    const owner = await createEmployee(ownerInput)
    const member = await createEmployee({
      ...memberInput,
      reportsToName: ownerInput.fullName,
      managerEmail: ownerInput.email,
    })
    if (!owner.ok) throw new Error(owner.error)
    if (!member.ok) throw new Error(member.error)

    const orgTeams = buildOrganisationFromEmployees(
      listMemoryEmployees(),
    ).teams
    expect(
      resolveTeamOwner(getEmployee(member.employee.employeeId), {
        orgTeams,
      })?.fullName,
    ).toBe('Angie Rahman')
  })

  it('keeps the organisation owner when the catalog names someone else', async () => {
    const departmentHead = await createEmployee({
      employeeId: 9,
      fullName: "Elvira Moey Shae'Fee",
      email: 'elvira@example.com',
      startDate: '2016-01-01',
      jobTitle: 'Head of People',
      department: 'Product',
      team: 'PTR',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    })
    const owner = await createEmployee(ownerInput)
    const member = await createEmployee({
      ...memberInput,
      reportsToName: ownerInput.fullName,
      managerEmail: ownerInput.email,
    })
    if (!departmentHead.ok) throw new Error(departmentHead.error)
    if (!owner.ok) throw new Error(owner.error)
    if (!member.ok) throw new Error(member.error)

    assignTeamOwner(member.employee.employeeId, departmentHead.employee)

    const orgTeams = buildOrganisationFromEmployees(
      listMemoryEmployees(),
    ).teams
    expect(
      resolveTeamOwner(getEmployee(member.employee.employeeId), {
        teams: [ptrTeam(departmentHead.employee)],
        orgTeams,
      })?.fullName,
    ).toBe('Angie Rahman')
  })
})
