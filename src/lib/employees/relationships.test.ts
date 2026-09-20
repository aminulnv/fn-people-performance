import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildOrganisationFromEmployees } from '@/lib/organisation/fromEmployees'
import {
  listMemoryEmployees,
  replaceMemoryEmployees,
} from './memoryStore'
import { isAboveInReportingLine, resolveTeamOwner } from './relationships'
import type { PlatformEmployee, PlatformTeam } from './types'
import { clearEmployees, createEmployee, getEmployee } from './store'

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

  it('does not guess a team owner from reporting lines', async () => {
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
      }),
    ).toBeNull()
  })

  it('uses the catalog owner even when reporting lines name someone else', async () => {
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
    ).toBe("Elvira Moey Shae'Fee")
  })

  it('uses the assigned team owner, not the reporting-line manager', async () => {
    const departmentHead = await createEmployee({
      employeeId: 9,
      fullName: "Elvira Moey Shae'Fee",
      email: 'elvira@example.com',
      startDate: '2016-01-01',
      jobTitle: 'Head of People',
      department: 'People & Culture',
      team: 'Performance & Total Rewards',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    })
    const owner = await createEmployee({
      ...ownerInput,
      department: 'People & Culture',
      team: 'Performance & Total Rewards',
    })
    const member = await createEmployee({
      ...memberInput,
      department: 'People & Culture',
      team: 'Performance & Total Rewards',
      reportsToName: ownerInput.fullName,
      managerEmail: ownerInput.email,
    })
    if (!departmentHead.ok) throw new Error(departmentHead.error)
    if (!owner.ok) throw new Error(owner.error)
    if (!member.ok) throw new Error(member.error)

    assignTeamOwner(member.employee.employeeId, departmentHead.employee)

    expect(
      resolveTeamOwner(getEmployee(member.employee.employeeId))?.fullName,
    ).toBe("Elvira Moey Shae'Fee")
  })
})

function person(
  employeeId: number,
  reportsToId?: number,
): PlatformEmployee {
  return {
    employeeId,
    fullName: `Person ${employeeId}`,
    email: `p${employeeId}@example.com`,
    startDate: '2020-01-01',
    role: '',
    jobTitle: '',
    department: '',
    team: '',
    division: '',
    reportsToName: '',
    reportsToId,
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: '',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

describe('isAboveInReportingLine', () => {
  const employee = person(1, 2)
  const manager = person(2, 3)
  const skip = person(3, 4)
  const top = person(4)
  const peer = person(9, 2)
  const directory = [employee, manager, skip, top, peer]

  it('includes the line manager and every manager above them', () => {
    expect(isAboveInReportingLine(2, employee, directory)).toBe(true)
    expect(isAboveInReportingLine(3, employee, directory)).toBe(true)
    expect(isAboveInReportingLine(4, employee, directory)).toBe(true)
  })

  it('excludes the person, their peers, and people below them', () => {
    expect(isAboveInReportingLine(1, employee, directory)).toBe(false)
    expect(isAboveInReportingLine(9, employee, directory)).toBe(false)
    expect(isAboveInReportingLine(1, manager, directory)).toBe(false)
  })
})
