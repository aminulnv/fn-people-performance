import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import type { PlatformEmployee } from '@/lib/employees/types'
import PeoplePage from '@/pages/PeoplePage'

function OpenedProfile() {
  const { employeeId } = useParams()
  return <p>Opened profile {employeeId}</p>
}

const { employeesState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as PlatformEmployee[],
    loadState: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => { }),
  },
}))

vi.mock('@/lib/employees/useEmployees', () => ({
  useEmployees: () => employeesState,
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null }),
}))

vi.mock('@/lib/useAuth', () => ({
  useAuth: () => ({ user: null }),
}))

vi.mock('@/lib/goals/useGoalTodoCounts', () => ({
  useGoalTodoCounts: () => ({ own: 0, reports: 0, total: 0 }),
}))

function person(id: number): PlatformEmployee {
  return {
    employeeId: id,
    fullName: `Person ${String(id).padStart(3, '0')}`,
    email: `person.${id}@example.com`,
    startDate: '2024-01-01',
    jobTitle: 'Engineer',
    department: id % 2 === 0 ? 'Product' : 'Finance',
    team: 'Core',
    division: 'FundedNext',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC1',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

afterEach(() => {
  cleanup()
  employeesState.employees = []
})

describe('PeoplePage', () => {
  it('does not mount a DOM row for every person in a large directory', () => {
    employeesState.employees = Array.from({ length: 80 }, (_, index) =>
      person(index + 1),
    )

    render(
      <MemoryRouter>
        <PeoplePage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('People')).toBeInTheDocument()
    expect(screen.getAllByText('80').length).toBeGreaterThan(0)

    const directoryNames = screen.getAllByRole('button', {
      name: /^Person /,
    })

    expect(directoryNames.length).toBeGreaterThan(0)
    expect(directoryNames.length).toBeLessThan(80)
  })

  it('opens a profile panel when the row is clicked', async () => {
    employeesState.employees = [person(1)]

    render(
      <MemoryRouter initialEntries={['/people']}>
        <Routes>
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/:employeeId" element={<OpenedProfile />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('person.1@example.com'))
    expect(
      await screen.findByRole('dialog', { name: 'Person 001' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Full view/i })).toHaveAttribute(
      'href',
      '/people/1',
    )
    expect(screen.queryByText('Opened profile 1')).not.toBeInTheDocument()
  })

  it('opens the manager in the same panel', async () => {
    const manager = person(2)
    manager.fullName = 'Alex Manager'
    const report = person(1)
    report.reportsToId = 2
    report.reportsToName = 'Alex Manager'
    employeesState.employees = [report, manager]

    render(
      <MemoryRouter initialEntries={['/people']}>
        <Routes>
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/:employeeId" element={<OpenedProfile />} />
        </Routes>
      </MemoryRouter>,
    )

    const reportRow = screen.getByText('person.1@example.com').closest('tr')
    if (!reportRow) throw new Error('Expected a directory row')

    fireEvent.click(within(reportRow).getByRole('button', { name: 'Alex Manager' }))
    expect(
      await screen.findByRole('dialog', { name: 'Alex Manager' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Opened profile 2')).not.toBeInTheDocument()
  })

  it('filters the directory from the Filters menu', () => {
    const ada = person(1)
    ada.fullName = 'Ada Lovelace'
    ada.department = 'Product'
    const cara = person(2)
    cara.fullName = 'Cara Finance'
    cara.department = 'Finance'
    employeesState.employees = [ada, cara]

    render(
      <MemoryRouter>
        <PeoplePage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Department' }))
    fireEvent.click(screen.getByRole('option', { name: 'Product' }))

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByText('Cara Finance')).not.toBeInTheDocument()
    expect(screen.getByText('1 shown')).toBeInTheDocument()
  })

  it('goes to the full profile from the panel', async () => {
    employeesState.employees = [person(1)]

    render(
      <MemoryRouter initialEntries={['/people']}>
        <Routes>
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/:employeeId" element={<OpenedProfile />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('person.1@example.com'))
    fireEvent.click(await screen.findByRole('link', { name: /Full view/i }))
    expect(screen.getByText('Opened profile 1')).toBeInTheDocument()
  })
})
