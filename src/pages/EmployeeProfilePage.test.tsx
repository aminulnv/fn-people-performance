import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import EmployeeFormPage from '@/pages/EmployeeFormPage'
import EmployeeProfilePage from '@/pages/EmployeeProfilePage'
import MyProfilePage from '@/pages/MyProfilePage'

const { employeesState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as never[],
    loadState: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => {}),
  },
}))

vi.mock('@/lib/employees/useEmployees', () => ({
  useEmployees: () => employeesState,
}))

function signIn(permissions: ('platform.write_all' | 'platform.read_all')[]) {
  writeSession({
    user: {
      id: '1',
      email: 'employee@example.com',
      name: 'Test Employee',
      personId: '1',
      permissions,
      title: 'Engineer',
    },
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

function renderRoute(path: string, routes: ReactNode) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {routes}
          <Route path="/people" element={<p>People directory</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

async function seedEmployee() {
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
}

async function seedManagerWithReports() {
  const manager = await createEmployee({
    employeeId: 2,
    fullName: 'Line Manager',
    email: 'manager@example.com',
    startDate: '2020-01-01',
    jobTitle: 'Engineering Manager',
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
  if (!manager.ok) throw new Error(manager.error)

  for (const employee of [
    { employeeId: 1, fullName: 'Test Employee', email: 'employee@example.com' },
    { employeeId: 3, fullName: 'Second Report', email: 'report@example.com' },
  ]) {
    const result = await createEmployee({
      ...employee,
      startDate: '2024-01-01',
      jobTitle: 'Engineer',
      department: 'Product',
      team: '',
      division: '',
      reportsToName: manager.employee.fullName,
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: manager.employee.email,
    })
    if (!result.ok) throw new Error(result.error)
  }
  employeesState.employees = [] as never[]
}

describe('V1 employee profiles', () => {
  beforeEach(() => {
    clearSession()
    clearEmployees()
    employeesState.employees = []
    employeesState.loadState = 'ready'
    employeesState.loadError = null
    employeesState.isLoading = false
    employeesState.reload.mockClear()
  })

  afterEach(() => {
    cleanup()
    clearSession()
    clearEmployees()
  })

  it('waits for the directory before deciding an employee is missing', () => {
    signIn(['platform.read_all'])
    employeesState.loadState = 'loading'
    employeesState.isLoading = true

    renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    expect(screen.getByLabelText('Loading employee')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Employee not found' })).not.toBeInTheDocument()
  })

  it('shows a retryable error instead of an unlinked-account message', async () => {
    signIn(['platform.read_all'])
    employeesState.loadState = 'error'
    employeesState.loadError = 'Directory unavailable'

    renderRoute('/profile', <Route path="/profile" element={<MyProfilePage />} />)

    expect(await screen.findByText('Directory unavailable')).toBeInTheDocument()
    expect(
      screen.queryByText(/not linked to a directory profile/i),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(employeesState.reload).toHaveBeenCalledOnce()
  })

  it('does not redirect a cold edit URL while the employee is loading', async () => {
    signIn(['platform.write_all'])
    employeesState.loadState = 'loading'
    employeesState.isLoading = true

    renderRoute(
      '/people/1/edit',
      <Route
        path="/people/:employeeId/edit"
        element={<EmployeeFormPage mode="edit" />}
      />,
    )

    expect(await screen.findByLabelText('Loading employee')).toBeInTheDocument()
    expect(screen.queryByText('People directory')).not.toBeInTheDocument()
  })

  it('hides edit actions and blocks the direct edit route without write access', async () => {
    await seedEmployee()
    signIn(['platform.read_all'])

    const profile = renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Edit employee details' }),
    ).not.toBeInTheDocument()

    profile.unmount()
    renderRoute(
      '/people/1/edit',
      <Route
        path="/people/:employeeId/edit"
        element={<EmployeeFormPage mode="edit" />}
      />,
    )
    expect(
      screen.getByText('You do not have permission to edit employee profiles.'),
    ).toBeInTheDocument()
  })

  it('links a resolved line manager to their V1 profile', async () => {
    await seedManagerWithReports()
    signIn(['platform.read_all'])

    const profile = renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    expect(
      profile.container.querySelector('.pd-profile__org-node.is-link'),
    ).toHaveAttribute('href', '/people/2')
  })

  it('shows the manager’s actual number of direct reports', async () => {
    await seedManagerWithReports()
    signIn(['platform.read_all'])

    const profile = renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    expect(profile.container.querySelector('.pd-profile__org-count')).toHaveTextContent(
      '2',
    )
  })

  it('lists direct reports on the Team tab', async () => {
    await seedManagerWithReports()
    signIn(['platform.read_all'])

    renderRoute(
      '/people/2',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Team/ }))

    expect(
      await screen.findByRole('heading', { name: 'Direct reports' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Test Employee/ }),
    ).toHaveAttribute('href', '/people/1')
    expect(
      screen.getByRole('link', { name: /Second Report/ }),
    ).toHaveAttribute('href', '/people/3')
  })

  it('links org structures and permissions', async () => {
    await seedEmployee()
    signIn(['platform.read_all'])

    renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    expect(
      await screen.findByRole('link', { name: /Org Structures/ }),
    ).toHaveAttribute('href', '/organisation/departments/product')

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(
      screen.getByRole('menuitem', { name: 'Permissions' }),
    ).toHaveAttribute('href', '/settings?section=access')
  })

  it('shows scorecards on the Performance tab', async () => {
    await seedEmployee()
    signIn(['platform.read_all'])

    renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Performance/ }))

    expect(
      await screen.findByRole('heading', { name: 'Performance history' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Q3 2026|Q2 2026|Q1 2026|2026/i }),
    ).toBeInTheDocument()
  })
})
