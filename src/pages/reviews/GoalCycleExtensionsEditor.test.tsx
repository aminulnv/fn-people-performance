import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { PlatformEmployee } from '@/lib/employees/types'
import { GoalCycleExtensionsEditor } from './GoalCycleExtensionsEditor'

const { employeesState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as PlatformEmployee[],
    loadState: 'ready' as const,
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => { }),
  },
}))

vi.mock('@/lib/employees/useEmployees', async () => {
  const { buildOrganisationFromEmployees } = await import(
    '@/lib/organisation/fromEmployees'
  )
  return {
    useEmployees: () => employeesState,
    useOrganisation: () => ({
      ...employeesState,
      organisation: buildOrganisationFromEmployees(employeesState.employees),
    }),
  }
})

function person(
  id: number,
  fields: Partial<PlatformEmployee> = {},
): PlatformEmployee {
  return {
    employeeId: id,
    fullName: `Person ${String(id).padStart(3, '0')}`,
    email: `person.${id}@example.com`,
    startDate: '2024-01-01',
    jobTitle: 'Engineer',
    department: 'Technology',
    team: 'Core',
    division: 'FundedNext',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC1',
    site: '',
    avatarUrl: `https://cdn.example.com/${id}.png`,
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...fields,
  }
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  employeesState.employees = []
})

function openSearch(query: string) {
  render(
    <GoalCycleExtensionsEditor
      extensions={[]}
      baseEndDate="2026-07-01"
      performanceStartDate="2026-09-21"
      onChange={() => { }}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /add deadline/i }))
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Search teams, departments, or people' }),
    { target: { value: query } },
  )
}

describe('GoalCycleExtensionsEditor search', () => {
  it('ranks an exact department name above people in that department', () => {
    employeesState.employees = [
      person(1, {
        fullName: 'Sheikh Syed Ahmed',
        department: 'People and Culture',
      }),
      person(2, {
        fullName: 'Tanzim Hasan Fahim',
        department: 'People and Culture',
      }),
    ]

    openSearch('People and Culture')

    const panel = screen.getByRole('listbox', { name: 'Population search results' })
    const department = within(panel).getByText('Departments')
    const people = within(panel).getByText('People')
    expect(
      department.compareDocumentPosition(people) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(within(panel).getByText('People and Culture')).toBeInTheDocument()
  })

  it('ranks an exact team name above people on that team', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed', team: 'Core' }),
      person(2, { fullName: 'Tanzim Hasan Fahim', team: 'Core' }),
    ]

    openSearch('Core')

    const panel = screen.getByRole('listbox', { name: 'Population search results' })
    const teams = within(panel).getByText('Teams')
    const people = within(panel).getByText('People')
    expect(
      teams.compareDocumentPosition(people) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
