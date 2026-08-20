import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PlatformEmployee } from '@/lib/employees/types'
import PeoplePage from '@/pages/PeoplePage'

const { employeesState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as PlatformEmployee[],
    loadState: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => {}),
  },
}))

vi.mock('@/lib/employees/useEmployees', () => ({
  useEmployees: () => employeesState,
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null }),
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

    const directoryLinks = screen
      .getAllByRole('link')
      .filter((link) => /^\/people\/\d+$/.test(link.getAttribute('href') ?? ''))

    expect(directoryLinks.length).toBeGreaterThan(0)
    expect(directoryLinks.length).toBeLessThan(80)
  })
})
