import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import { PeopleFilters } from './PeopleFilters'

function person(
  overrides: Partial<PlatformEmployee> & Pick<PlatformEmployee, 'employeeId' | 'fullName'>,
): PlatformEmployee {
  return {
    email: `${overrides.employeeId}@example.com`,
    startDate: '2024-01-01',
    jobTitle: 'Engineer',
    department: 'Product',
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
    ...overrides,
  }
}

afterEach(cleanup)

describe('PeopleFilters', () => {
  const employees = [
    person({ employeeId: 1, fullName: 'Ada Lovelace', department: 'Product' }),
    person({
      employeeId: 2,
      fullName: 'Cara Finance',
      department: 'Finance',
      jobTitle: 'Analyst',
    }),
  ]

  it('lists people attributes and drills into values', () => {
    const onAttributeFiltersChange = vi.fn()
    render(
      <PeopleFilters
        employees={employees}
        statusFilter={null}
        onStatusFilterChange={vi.fn()}
        attributeFilters={{}}
        onAttributeFiltersChange={onAttributeFiltersChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(screen.getByText('People attributes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Email' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Job title' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Team' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reports to' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Department' }))
    fireEvent.click(screen.getByRole('option', { name: 'Finance' }))
    expect(onAttributeFiltersChange).toHaveBeenCalledWith({
      department: ['Finance'],
    })
  })

  it('filters the attribute list from search', () => {
    render(
      <PeopleFilters
        employees={employees}
        statusFilter={null}
        onStatusFilterChange={vi.fn()}
        attributeFilters={{}}
        onAttributeFiltersChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.change(screen.getByPlaceholderText('Search attributes...'), {
      target: { value: 'job' },
    })
    expect(screen.getByRole('button', { name: 'Job title' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Department' })).not.toBeInTheDocument()
  })

  it('shows how many values are selected on an attribute', () => {
    render(
      <PeopleFilters
        employees={employees}
        statusFilter="active"
        onStatusFilterChange={vi.fn()}
        attributeFilters={{ department: ['Product', 'Finance'] }}
        onAttributeFiltersChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filters, 3 selected' }))
    expect(
      screen.getByRole('button', { name: 'Status, 1 selected' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Department, 2 selected' }),
    ).toBeInTheDocument()
  })
})
