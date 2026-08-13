import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  buildDirectory,
  buildFacetOptions,
  emptySelections,
  filterPeople,
  groupPeople,
  reportingChain,
  sortPeople,
  summarise,
} from './directory'

const NOW = new Date('2026-08-12T00:00:00Z')

function employee(overrides: Partial<PlatformEmployee> = {}): PlatformEmployee {
  return {
    employeeId: 1,
    fullName: 'Amina Rahman',
    email: 'amina@example.com',
    startDate: '2024-02-01',
    jobTitle: 'Engineer',
    department: 'Engineering',
    team: 'Platform',
    division: 'Technology',
    reportsToName: 'Kabir Hasan',
    departmentHeadName: 'Kabir Hasan',
    hrbpName: 'Nadia Islam',
    jobGrade: 'L4',
    managerEmail: 'kabir@example.com',
    reportsToId: 2,
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    ...overrides,
  }
}

describe('buildDirectory', () => {
  it('reports tenure in years and months', () => {
    const [person] = buildDirectory([employee({ startDate: '2024-02-01' })], NOW)
    expect(person.tenureMonths).toBe(30)
    expect(person.tenureLabel).toBe('2y 6mo')
    expect(person.tenureBand).toBe('lt3y')
  })

  it('treats a missing start date as unknown tenure rather than zero', () => {
    const [person] = buildDirectory([employee({ startDate: '' })], NOW)
    expect(person.tenureMonths).toBeNull()
    expect(person.tenureBand).toBe('unknown')
    expect(person.gaps).toContain('startDate')
  })

  it('counts direct reports from the reporting line', () => {
    const people = buildDirectory(
      [
        employee({ employeeId: 2, fullName: 'Kabir Hasan', reportsToId: undefined }),
        employee({ employeeId: 3, reportsToId: 2 }),
        employee({ employeeId: 4, reportsToId: 2 }),
      ],
      NOW,
    )
    expect(people.find((p) => p.id === 2)?.directReportCount).toBe(2)
    expect(people.find((p) => p.id === 3)?.directReportCount).toBe(0)
  })

  it('flags missing organisational data', () => {
    const [person] = buildDirectory(
      [employee({ jobGrade: '', reportsToName: '', hrbpName: '' })],
      NOW,
    )
    expect(person.gaps).toEqual(['manager', 'grade', 'hrbp'])
  })
})

describe('summarise', () => {
  it('counts recent joiners as those under three months', () => {
    const stats = summarise(
      buildDirectory(
        [
          employee({ employeeId: 1, startDate: '2026-07-01' }),
          employee({ employeeId: 2, startDate: '2020-01-01' }),
          employee({ employeeId: 3, startDate: '2020-01-01', isActive: false }),
        ],
        NOW,
      ),
    )
    expect(stats).toMatchObject({
      total: 3,
      active: 2,
      inactive: 1,
      joinedLast90Days: 1,
    })
  })
})

describe('filterPeople', () => {
  const people = buildDirectory(
    [
      employee({ employeeId: 1, fullName: 'Amina Rahman', department: 'Engineering' }),
      employee({ employeeId: 2, fullName: 'Bilal Khan', department: 'Finance' }),
      employee({ employeeId: 3, fullName: 'Chandni Roy', department: 'Finance', isActive: false }),
    ],
    NOW,
  )

  it('requires every search token to match', () => {
    expect(filterPeople(people, 'bilal finance', emptySelections())).toHaveLength(1)
    expect(filterPeople(people, 'bilal engineering', emptySelections())).toHaveLength(0)
  })

  it('combines values within a facet as OR and across facets as AND', () => {
    const selections = {
      ...emptySelections(),
      department: ['Engineering', 'Finance'],
      status: ['active'],
    }
    const matched = filterPeople(people, '', selections)
    expect(matched.map((person) => person.id)).toEqual([1, 2])
  })
})

describe('buildFacetOptions', () => {
  const people = buildDirectory(
    [
      employee({ employeeId: 1, department: 'Engineering', team: 'Platform' }),
      employee({ employeeId: 2, department: 'Finance', team: 'Controlling' }),
      employee({ employeeId: 3, department: 'Finance', team: '' }),
    ],
    NOW,
  )

  it('counts a facet against the other facets, not itself', () => {
    const selections = { ...emptySelections(), department: ['Finance'] }
    const facets = buildFacetOptions(people, '', selections)

    // Department counts ignore the department selection so the list stays usable.
    expect(facets.department.find((o) => o.value === 'Engineering')?.count).toBe(1)
    // Team counts respect it.
    expect(facets.team.find((o) => o.value === 'Platform')).toBeUndefined()
  })

  it('labels empty values as unassigned and sorts them last', () => {
    const facets = buildFacetOptions(people, '', emptySelections())
    expect(facets.team.at(-1)).toMatchObject({ label: 'Unassigned', count: 1 })
  })
})

describe('sortPeople', () => {
  const people = buildDirectory(
    [
      employee({ employeeId: 1, fullName: 'Amina', jobGrade: 'L5' }),
      employee({ employeeId: 2, fullName: 'Bilal', jobGrade: '' }),
      employee({ employeeId: 3, fullName: 'Chandni', jobGrade: 'L3' }),
    ],
    NOW,
  )

  it('keeps blank values last in both directions', () => {
    const asc = sortPeople(people, { key: 'grade', direction: 'asc' })
    const desc = sortPeople(people, { key: 'grade', direction: 'desc' })
    expect(asc.map((p) => p.grade)).toEqual(['L3', 'L5', ''])
    expect(desc.map((p) => p.grade)).toEqual(['L5', 'L3', ''])
  })
})

describe('groupPeople', () => {
  it('orders unassigned groups last', () => {
    const people = buildDirectory(
      [
        employee({ employeeId: 1, team: 'Platform' }),
        employee({ employeeId: 2, team: '' }),
        employee({ employeeId: 3, team: 'Controlling' }),
      ],
      NOW,
    )
    expect(groupPeople(people, 'team').map((group) => group.label)).toEqual([
      'Controlling',
      'Platform',
      'Unassigned',
    ])
  })
})

describe('reportingChain', () => {
  it('walks up to the top of the org', () => {
    const people = buildDirectory(
      [
        employee({ employeeId: 1, fullName: 'Chief', reportsToId: undefined }),
        employee({ employeeId: 2, fullName: 'Director', reportsToId: 1 }),
        employee({ employeeId: 3, fullName: 'Engineer', reportsToId: 2 }),
      ],
      NOW,
    )
    const byId = new Map(people.map((person) => [person.id, person]))
    const chain = reportingChain(people[2], byId)
    expect(chain.map((person) => person.name)).toEqual(['Chief', 'Director'])
  })

  it('stops on a circular reporting line', () => {
    const people = buildDirectory(
      [
        employee({ employeeId: 1, reportsToId: 2 }),
        employee({ employeeId: 2, reportsToId: 1 }),
      ],
      NOW,
    )
    const byId = new Map(people.map((person) => [person.id, person]))
    expect(reportingChain(people[0], byId)).toHaveLength(1)
  })
})
