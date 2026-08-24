import { describe, expect, it } from 'vitest'
import { buildSearchCatalog } from './catalog'
import type { SearchCatalogInput } from './catalog'
import type { GoalsSnapshot } from '@/lib/goals/types'
import type { OrganisationSnapshot } from '@/lib/organisation/types'

const emptyGoals: GoalsSnapshot = {
  cycle: {
    id: 'q3-2026',
    label: 'Q3 2026',
    day1: '2026-07-01',
    phase: 'window_open',
    goalCountPolicy: {
      minimumRequired: 1,
      recommendedMinimum: 3,
      recommendedMaximum: 5,
      maximumAllowed: 7,
    },
    postWindowGoalPolicy: 'two_tier_approval',
  },
  cycleStatus: 'current',
  availableCycles: [],
  activePersonId: '1',
  people: [
    {
      id: '1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      title: 'Engineer',
      department: 'Platform',
      joinDate: '2020-01-01',
      reportIds: [],
      avatarHue: 12,
      blurb: '',
    },
  ],
  byPerson: {
    '1': {
      personId: '1',
      status: 'draft',
      goals: [
        {
          id: 'g1',
          description: 'Ship search',
          weight: 100,
          measurements: [],
        },
      ],
    },
  },
}

const organisation: OrganisationSnapshot = {
  departments: [
    {
      id: 'platform',
      name: 'Platform',
      head: { fullName: 'Ada Lovelace' },
      headcount: 1,
      teams: [],
      memberIds: [1],
    },
  ],
  teams: [
    {
      id: 'platform::search',
      name: 'Search',
      departmentName: 'Platform',
      manager: { fullName: 'Ada Lovelace' },
      headcount: 1,
      memberIds: [1],
    },
  ],
}

function input(
  overrides: Partial<SearchCatalogInput> = {},
): SearchCatalogInput {
  return {
    user: {
      personId: '1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      employeeId: 1,
      permissions: ['platform.write_all'],
    },
    employees: [
      {
        employeeId: 1,
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        startDate: '2020-01-01',
        jobTitle: 'Engineer',
        department: 'Platform',
        team: 'Search',
        division: 'Product',
        reportsToName: '',
        departmentHeadName: '',
        hrbpName: '',
        jobGrade: 'L4',
        site: 'Dhaka',
        avatarUrl: '',
        managerEmail: '',
        isActive: true,
        createdAt: '2020-01-01',
        updatedAt: '2020-01-01',
      },
    ],
    organisation,
    goals: emptyGoals,
    cycles: [],
    scorecards: [],
    notifications: [],
    ...overrides,
  }
}

describe('buildSearchCatalog', () => {
  it('indexes people, goals, org units, and write actions', () => {
    const items = buildSearchCatalog(input())
    const ids = items.map((item) => item.id)
    expect(ids).toContain('person:1')
    expect(ids).toContain('goal:q3-2026:1:g1')
    expect(ids).toContain('department:platform')
    expect(ids).toContain('team:platform::search')
    expect(ids).toContain('action:create-person')
    expect(ids).toContain('page:/goals')
  })

  it('hides create-person without write access', () => {
    const items = buildSearchCatalog(
      input({
        user: {
          personId: '1',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          permissions: ['platform.read_all'],
        },
      }),
    )
    expect(items.some((item) => item.id === 'action:create-person')).toBe(false)
  })
})
