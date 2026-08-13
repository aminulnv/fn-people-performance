import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  buildOrganisationFromEmployees,
  mergeOrganisationWithCatalog,
} from './fromEmployees'

function employee(
  partial: Partial<PlatformEmployee> &
    Pick<PlatformEmployee, 'employeeId' | 'fullName' | 'email'>,
): PlatformEmployee {
  return {
    startDate: '2026-01-01',
    jobTitle: 'Specialist',
    department: '',
    team: '',
    division: 'FundedNext',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC2',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('buildOrganisationFromEmployees', () => {
  it('returns empty snapshot when there are no active employees', () => {
    expect(
      buildOrganisationFromEmployees([
        employee({
          employeeId: 1,
          fullName: 'Inactive',
          email: 'inactive@example.com',
          isActive: false,
          department: 'Engineering',
          team: 'Platform',
        }),
      ]),
    ).toEqual({ departments: [], teams: [] })
  })

  it('groups teams under departments with head and manager', () => {
    const head = employee({
      employeeId: 10,
      fullName: 'Dana Head',
      email: 'dana@example.com',
      department: 'Engineering',
      team: 'Platform',
      jobTitle: 'Head of Department',
      departmentHeadName: 'Dana Head',
      departmentHeadId: 10,
    })
    const manager = employee({
      employeeId: 20,
      fullName: 'Morgan Manager',
      email: 'morgan@example.com',
      department: 'Engineering',
      team: 'Platform',
      jobTitle: 'Manager',
      reportsToName: 'Dana Head',
      reportsToId: 10,
      departmentHeadName: 'Dana Head',
      departmentHeadId: 10,
      managerEmail: 'dana@example.com',
    })
    const ic = employee({
      employeeId: 30,
      fullName: 'Ivy Contributor',
      email: 'ivy@example.com',
      department: 'Engineering',
      team: 'Platform',
      reportsToName: 'Morgan Manager',
      reportsToId: 20,
      departmentHeadName: 'Dana Head',
      departmentHeadId: 10,
      managerEmail: 'morgan@example.com',
    })
    const growth = employee({
      employeeId: 31,
      fullName: 'Gabe Growth',
      email: 'gabe@example.com',
      department: 'Engineering',
      team: 'Growth',
      reportsToName: 'Morgan Manager',
      reportsToId: 20,
      departmentHeadName: 'Dana Head',
      departmentHeadId: 10,
      managerEmail: 'morgan@example.com',
    })

    const snapshot = buildOrganisationFromEmployees([
      head,
      manager,
      ic,
      growth,
    ])

    expect(snapshot.departments).toHaveLength(1)
    const engineering = snapshot.departments[0]
    expect(engineering.name).toBe('Engineering')
    expect(engineering.headcount).toBe(4)
    expect(engineering.head).toEqual({
      employeeId: 10,
      fullName: 'Dana Head',
    })
    expect(engineering.teams.map((t) => t.name)).toEqual(['Growth', 'Platform'])

    const platform = engineering.teams.find((t) => t.name === 'Platform')
    expect(platform?.headcount).toBe(3)
    expect(platform?.manager).toEqual({
      employeeId: 20,
      fullName: 'Morgan Manager',
    })

    expect(snapshot.teams).toHaveLength(2)
  })

  it('uses Unassigned when department or team is blank', () => {
    const snapshot = buildOrganisationFromEmployees([
      employee({
        employeeId: 1,
        fullName: 'No Org',
        email: 'noorg@example.com',
      }),
    ])

    expect(snapshot.departments[0]?.name).toBe('Unassigned')
    expect(snapshot.departments[0]?.teams[0]?.name).toBe('Unassigned')
  })

  it('keeps empty catalog departments in the organisation snapshot', () => {
    const snapshot = mergeOrganisationWithCatalog(
      buildOrganisationFromEmployees([]),
      [
        {
          id: 99,
          name: 'Strategy',
          headEmployeeId: 7,
          headName: 'Casey Owner',
          headEmail: null,
          hrbpEmployeeId: null,
          hrbpName: null,
          hrbpEmail: null,
          headcount: 0,
          teamCount: 0,
        },
      ],
    )

    expect(snapshot.departments).toEqual([
      {
        id: 'strategy',
        name: 'Strategy',
        head: { employeeId: 7, fullName: 'Casey Owner' },
        headcount: 0,
        teams: [],
        memberIds: [],
      },
    ])
  })
})
