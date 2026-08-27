import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createEmployee, clearEmployees } from '@/lib/employees/store'
import { departmentKey } from '@/lib/organisation/fromEmployees'
import { departmentDetailPath } from '@/lib/organisation/paths'
import { successNotice } from '@/pages/reviews/ReviewSaveBanner'
import DepartmentDetailPage from '@/pages/DepartmentDetailPage'

const { employeesState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as never[],
    loadState: 'ready' as const,
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => {}),
  },
}))

vi.mock('@/lib/employees/useEmployees', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/employees/useEmployees')>()
  return {
    ...actual,
    useEmployees: () => employeesState,
  }
})

vi.mock('@/lib/employees/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/employees/store')>()
  return {
    ...actual,
    listDepartments: async () => [],
  }
})

afterEach(() => {
  cleanup()
  clearEmployees()
  employeesState.employees = []
})

describe('DepartmentDetailPage', () => {
  beforeEach(async () => {
    const result = await createEmployee({
      employeeId: 1,
      fullName: 'Test Employee',
      email: 'employee@example.com',
      startDate: '2024-01-01',
      jobTitle: 'Engineer',
      department: 'Product',
      team: '',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    })
    if (!result.ok) throw new Error(result.error)
    employeesState.employees = [result.employee] as never[]
  })

  it('shows a success toast after creating a department', async () => {
    const path = departmentDetailPath(departmentKey('Product'))

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: path,
            state: { saveNotice: successNotice('Department created.') },
          },
        ]}
      >
        <Routes>
          <Route
            path="/organisation/departments/:departmentId"
            element={<DepartmentDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Department created.')
    expect(await screen.findByRole('heading', { name: 'Product' })).toBeInTheDocument()
  })
})
