import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import {
  listMemoryEmployees,
  replaceMemoryEmployees,
} from '@/lib/employees/memoryStore'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import {
  createCycleGroup,
  listReviewCycles,
  resetReviewsStoreForTests,
} from '@/lib/reviews/store'
import EmployeeFormPage from '@/pages/EmployeeFormPage'
import { successNotice } from '@/pages/reviews/ReviewSaveBanner'
import EmployeeProfilePage from '@/pages/EmployeeProfilePage'
import MyProfilePage from '@/pages/MyProfilePage'

const { employeesState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as never[],
    loadState: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => { }),
  },
}))

vi.mock('@/lib/employees/useEmployees', () => ({
  useEmployees: () => employeesState,
}))

vi.mock('@/lib/goals/useGoalTodoCounts', () => ({
  useGoalTodoCounts: () => ({ own: 0, reports: 1, total: 1 }),
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
    resetReviewsStoreForTests()
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
    resetReviewsStoreForTests()
  })

  it('renders a cached employee while the directory is still loading', async () => {
    await seedEmployee()
    signIn(['platform.read_all'])
    employeesState.loadState = 'loading'
    employeesState.isLoading = true

    renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    expect(screen.getByRole('heading', { name: 'Test Employee' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading employee')).not.toBeInTheDocument()
  })

  it('shows a success toast after adding or saving a person', async () => {
    await seedEmployee()
    signIn(['platform.read_all'])

    render(
      <AuthProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/people/1',
              state: { saveNotice: successNotice('Person created.') },
            },
          ]}
        >
          <Routes>
            <Route
              path="/people/:employeeId"
              element={<EmployeeProfilePage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Person created.')
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

  it('places team owner directly under team in the employee details list', async () => {
    await seedEmployee()
    signIn(['platform.read_all'])

    renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    expect(
      document.querySelector('.pd-profile__detail-group-title'),
    ).toBeNull()
    expect(
      [...document.querySelectorAll('.pd-profile__detail-label-text')].map(
        (el) => el.textContent,
      ),
    ).toEqual([
      'Email',
      'Employee ID',
      'Status',
      'Role',
      'Seniority',
      'Department',
      'Team',
      'Team Owner',
      'Division',
      'Site',
      'Line Manager',
      'Department Head',
      'HRBP',
      'Joining Date',
    ])
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

  it('links a team catalog owner to their V1 profile', async () => {
    const owner = await createEmployee({
      employeeId: 5,
      fullName: 'Angie Rahman',
      email: 'angie@example.com',
      startDate: '2018-01-01',
      jobTitle: 'Team Lead',
      department: 'People & Culture',
      team: 'Performance & Total Rewards',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    })
    if (!owner.ok) throw new Error(owner.error)

    const employee = await createEmployee({
      employeeId: 1,
      fullName: 'Test Employee',
      email: 'employee@example.com',
      startDate: '2024-01-01',
      jobTitle: 'Engineer',
      department: 'People & Culture',
      team: 'Performance & Total Rewards',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    })
    if (!employee.ok) throw new Error(employee.error)

    replaceMemoryEmployees(
      listMemoryEmployees().map((row) =>
        row.employeeId === 1
          ? {
              ...row,
              teamOwnerId: owner.employee.employeeId,
              teamOwnerName: owner.employee.fullName,
            }
          : row,
      ),
    )
    employeesState.employees = listMemoryEmployees() as never[]

    signIn(['platform.read_all'])

    renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    expect(screen.getByText('Team Owner')).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: /Angie Rahman/ }),
    ).toHaveAttribute('href', '/people/5')
    expect(
      screen.getByRole('link', { name: 'People & Culture' }),
    ).toHaveAttribute('href', '/organisation/departments/people%20%26%20culture')
    expect(
      screen.getByRole('link', { name: 'Performance & Total Rewards' }),
    ).toHaveAttribute(
      'href',
      '/organisation/teams/people%20%26%20culture%3A%3Aperformance%20%26%20total%20rewards',
    )
  })

  it('shows the organisation team owner on My Profile, not the department head stored as team owner', async () => {
    const departmentHead = await createEmployee({
      employeeId: 9,
      fullName: "Elvira Moey Shae'Fee",
      email: 'elvira@example.com',
      startDate: '2016-01-01',
      jobTitle: 'Head of People',
      department: 'People & Culture',
      team: 'Performance & Total Rewards',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    })
    const owner = await createEmployee({
      employeeId: 5,
      fullName: 'Angie Ng Yun Ni',
      email: 'angie@example.com',
      startDate: '2018-01-01',
      jobTitle: 'Team Lead',
      department: 'People & Culture',
      team: 'Performance & Total Rewards',
      division: '',
      reportsToName: departmentHead.ok ? departmentHead.employee.fullName : '',
      departmentHeadName: departmentHead.ok
        ? departmentHead.employee.fullName
        : '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: departmentHead.ok ? departmentHead.employee.email : '',
    })
    const employee = await createEmployee({
      employeeId: 1,
      fullName: 'Aminul Islam Borhan',
      email: 'employee@example.com',
      startDate: '2024-01-01',
      jobTitle: 'Sr. Executive',
      department: 'People & Culture',
      team: 'Performance & Total Rewards',
      division: '',
      reportsToName: owner.ok ? owner.employee.fullName : '',
      departmentHeadName: departmentHead.ok
        ? departmentHead.employee.fullName
        : '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: owner.ok ? owner.employee.email : '',
    })
    if (!departmentHead.ok) throw new Error(departmentHead.error)
    if (!owner.ok) throw new Error(owner.error)
    if (!employee.ok) throw new Error(employee.error)

    replaceMemoryEmployees(
      listMemoryEmployees().map((row) =>
        row.employeeId === 1
          ? {
              ...row,
              teamOwnerId: departmentHead.employee.employeeId,
              teamOwnerName: departmentHead.employee.fullName,
              departmentHeadId: departmentHead.employee.employeeId,
            }
          : row,
      ),
    )
    employeesState.employees = listMemoryEmployees() as never[]

    signIn(['platform.read_all'])

    renderRoute('/profile', <Route path="/profile" element={<MyProfilePage />} />)

    const teamOwnerRow = (await screen.findByText('Team Owner')).closest(
      '.pd-profile__detail-row',
    )
    expect(teamOwnerRow).toHaveTextContent('Angie Ng Yun Ni')
    expect(teamOwnerRow).not.toHaveTextContent("Elvira Moey Shae'Fee")
    expect(
      teamOwnerRow?.querySelector('a.pd-people__person-link'),
    ).toHaveAttribute('href', '/people/5')
    expect(
      screen.getByText('Department Head').closest('.pd-profile__detail-row'),
    ).toHaveTextContent("Elvira Moey Shae'Fee")
  })

  it('links a resolved HRBP to their V1 profile', async () => {
    const hrbp = await createEmployee({
      employeeId: 4,
      fullName: 'Nadia Islam',
      email: 'hrbp@example.com',
      startDate: '2019-01-01',
      jobTitle: 'HR Business Partner',
      department: 'People',
      team: '',
      division: '',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      managerEmail: '',
    })
    if (!hrbp.ok) throw new Error(hrbp.error)

    const employee = await createEmployee({
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
      hrbpName: hrbp.employee.fullName,
      jobGrade: '',
      site: '',
      managerEmail: '',
    })
    if (!employee.ok) throw new Error(employee.error)
    employeesState.employees = [hrbp.employee, employee.employee] as never[]

    signIn(['platform.read_all'])

    renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    expect(
      screen.getByRole('link', { name: /Nadia Islam/ }),
    ).toHaveAttribute('href', '/people/4')
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

  it('shows the pending-approval count on the Goals section tab', async () => {
    await seedEmployee()
    signIn(['platform.read_all'])

    renderRoute(
      '/people/1',
      <Route path="/people/:employeeId" element={<EmployeeProfilePage />} />,
    )

    expect(
      await screen.findByRole('button', { name: /Goals.*1 item needs attention/ }),
    ).toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: 'View org chart' })).toHaveAttribute(
      'href',
      '/organisation/chart?person=1',
    )
    expect(screen.getByRole('link', { name: 'Product' })).toHaveAttribute(
      'href',
      '/organisation/departments/product',
    )

    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'More actions' }).closest(
        '.pd-profile__more',
      )!,
    )
    expect(
      screen.getByRole('menuitem', { name: 'Permissions' }),
    ).toHaveAttribute('href', '/settings?section=access')
  })

  it('shows scorecards on the Performance tab', async () => {
    await seedEmployee()
    signIn(['platform.read_all'])
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('Expected a seeded review cycle')
    await createCycleGroup(cycle.id, {
      name: 'Everyone',
      memberIds: [1],
    })

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
