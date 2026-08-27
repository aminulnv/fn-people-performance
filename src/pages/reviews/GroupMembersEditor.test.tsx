import { useState, type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PlatformEmployee } from '@/lib/employees/types'
import { GroupMembersEditor } from './GroupMembersEditor'

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

function renderEditor(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function searchBox() {
  return screen.getByRole('searchbox', { name: 'Search people in this group' })
}

function Harness({ initialIds = [] }: { initialIds?: number[] }) {
  const [memberIds, setMemberIds] = useState(initialIds)
  return (
    <GroupMembersEditor memberIds={memberIds} onChange={setMemberIds} />
  )
}

afterEach(() => {
  cleanup()
  employeesState.employees = []
})

describe('GroupMembersEditor', () => {
  it('adds a person from one search that also lists teams and departments', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    renderEditor(<Harness />)

    expect(screen.queryByRole('group', { name: 'Browse people' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Department' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Team' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Person' })).not.toBeInTheDocument()
    expect(screen.getByText('Search to add people, teams, or departments')).toBeInTheDocument()

    fireEvent.change(searchBox(), { target: { value: 'Core' } })

    expect(screen.getByRole('region', { name: 'People' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Departments' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Teams' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add People' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Select Sheikh Syed Ahmed' }))

    expect(screen.getByRole('button', { name: /add 1 person/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /add 1 person/i }))
    fireEvent.change(searchBox(), { target: { value: '' } })

    expect(screen.getByText('Sheikh Syed Ahmed')).toBeInTheDocument()
    expect(screen.queryByText('Tanzim Hasan Fahim')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add 1 person/i })).not.toBeInTheDocument()
  })

  it('adds every checked person from the search results', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
      person(3, { fullName: 'Tanvir Zaman' }),
    ]

    renderEditor(<Harness />)
    fireEvent.change(searchBox(), { target: { value: 'Engineer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Select Sheikh Syed Ahmed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select Tanzim Hasan Fahim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select Tanvir Zaman' }))
    fireEvent.click(screen.getByRole('button', { name: /add 3 people/i }))
    fireEvent.change(searchBox(), { target: { value: '' } })

    expect(screen.getByText('Sheikh Syed Ahmed')).toBeInTheDocument()
    expect(screen.getByText('Tanzim Hasan Fahim')).toBeInTheDocument()
    expect(screen.getByText('Tanvir Zaman')).toBeInTheDocument()
  })

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

    renderEditor(<Harness />)
    fireEvent.change(searchBox(), { target: { value: 'People and Culture' } })

    const department = screen.getByRole('region', { name: 'Departments' })
    const people = screen.getByRole('region', { name: 'People' })
    expect(
      department.compareDocumentPosition(people) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(within(department).getByText('People and Culture')).toBeInTheDocument()
  })

  it('ranks an exact team name above people on that team', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed', team: 'Core' }),
      person(2, { fullName: 'Tanzim Hasan Fahim', team: 'Core' }),
    ]

    renderEditor(<Harness />)
    fireEvent.change(searchBox(), { target: { value: 'Core' } })

    const teams = screen.getByRole('region', { name: 'Teams' })
    const people = screen.getByRole('region', { name: 'People' })
    expect(
      teams.compareDocumentPosition(people) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('adds remaining people when a department is checked', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed', department: 'Technology' }),
      person(2, { fullName: 'Tanzim Hasan Fahim', department: 'Technology' }),
      person(3, { fullName: 'Tanvir Zaman', department: 'Operations' }),
    ]

    renderEditor(<Harness />)
    fireEvent.change(searchBox(), { target: { value: 'Technology' } })
    fireEvent.click(screen.getByRole('button', { name: 'Select Technology' }))
    fireEvent.click(screen.getByRole('button', { name: /add 2 people/i }))
    fireEvent.change(searchBox(), { target: { value: '' } })

    expect(screen.getByText('Sheikh Syed Ahmed')).toBeInTheDocument()
    expect(screen.getByText('Tanzim Hasan Fahim')).toBeInTheDocument()
    expect(screen.queryByText('Tanvir Zaman')).not.toBeInTheDocument()
  })

  it('removes checked members with the remove action', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    renderEditor(<Harness initialIds={[1]} />)
    expect(screen.getByText('Sheikh Syed Ahmed')).toBeInTheDocument()
    expect(screen.queryByText('Tanzim Hasan Fahim')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Select Sheikh Syed Ahmed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove 1 person' }))

    expect(screen.getByText('Search to add people, teams, or departments')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove 1 person' })).not.toBeInTheDocument()
  })

  it('shows each department Core team with that team’s headcount', () => {
    employeesState.employees = [
      person(1, {
        fullName: 'Syed Abdullah Jayed',
        department: 'Management',
        team: 'Core',
      }),
      person(2, {
        fullName: 'Syed Abdullah Galib',
        department: 'Management',
        team: 'Core',
      }),
      person(3, {
        fullName: 'Tanzim Hasan Fahim',
        department: 'Technology',
        team: 'Core',
      }),
      person(4, {
        fullName: 'Md. Abdullah Al Monaem',
        department: 'Operations',
        team: 'Core',
      }),
    ]

    renderEditor(<Harness />)
    fireEvent.change(searchBox(), { target: { value: 'Core' } })

    const teams = screen.getByRole('region', { name: 'Teams' })
    expect(within(teams).getByText('Management · 2 people')).toBeInTheDocument()
    expect(within(teams).getByText('Technology · 1 person')).toBeInTheDocument()
    expect(within(teams).getByText('Operations · 1 person')).toBeInTheDocument()
    expect(screen.queryByText(/19 people/)).not.toBeInTheDocument()
  })

  it('does not offer departments when picking people only', () => {
    employeesState.employees = [
      person(1, { fullName: 'Jayed Sarker', department: 'Leadership' }),
    ]

    renderEditor(
      <GroupMembersEditor
        memberIds={[]}
        onChange={() => { }}
        searchLabel="Add Senior Leaders"
        placeholder="Add a person…"
        peopleOnly
      />,
    )

    const search = screen.getByRole('searchbox', { name: 'Add Senior Leaders' })
    expect(search).toBeInTheDocument()
    expect(screen.getByText('Search to add people')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Senior Leaders' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add 1 person/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Department' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Team' })).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'Jayed' } })
    expect(screen.getByRole('button', { name: 'Select Jayed Sarker' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'People' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Departments' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Teams' })).not.toBeInTheDocument()
  })

  it('filters members already in the group by search', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    renderEditor(<Harness initialIds={[1, 2]} />)
    fireEvent.change(searchBox(), { target: { value: 'Tanzim' } })

    expect(screen.getByText('Tanzim Hasan Fahim')).toBeInTheDocument()
    expect(screen.queryByText('Sheikh Syed Ahmed')).not.toBeInTheDocument()
  })
})
