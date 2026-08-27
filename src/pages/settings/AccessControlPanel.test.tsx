import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import { AccessControlPanel } from './AccessControlPanel'

const { fetchAccessControl, assignEmployeeAccess } = vi.hoisted(() => ({
  fetchAccessControl: vi.fn(),
  assignEmployeeAccess: vi.fn(),
}))

vi.mock('@/lib/employees/useEmployees', () => ({
  useEmployees: () => ({
    employees: [
      {
        employeeId: 9,
        fullName: 'New Admin',
        email: 'new.admin@example.com',
        startDate: '2024-01-01',
        jobTitle: 'Lead',
        department: 'Product',
        team: '',
        division: '',
        reportsToName: '',
        departmentHeadName: '',
        hrbpName: '',
        jobGrade: '',
        site: '',
        avatarUrl: '',
        managerEmail: '',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    isLoading: false,
    loadState: 'ready',
    loadError: null,
    reload: async () => {},
  }),
}))

vi.mock('@/lib/accessControl/api', () => ({
  fetchAccessControl,
  assignEmployeeAccess,
}))

function signIn() {
  writeSession({
    user: {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin',
      personId: '1',
      permissions: ['access.manage', 'platform.write_all'],
      title: 'Admin',
    },
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('AccessControlPanel', () => {
  beforeEach(() => {
    clearSession()
    signIn()
    fetchAccessControl.mockResolvedValue({
      profiles: [
        {
          key: 'admin_read',
          roleName: 'admin',
          label: 'All read access',
          description: 'Read',
          permissions: ['platform.read_all'],
        },
      ],
      assignments: [
        {
          employeeId: 9,
          profileKey: 'admin_read',
          assignedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    assignEmployeeAccess.mockResolvedValue(null)
  })

  afterEach(() => {
    cleanup()
    clearSession()
    vi.clearAllMocks()
  })

  it('shows a success toast after changing access', async () => {
    render(
      <AuthProvider>
        <AccessControlPanel />
      </AuthProvider>,
    )

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Remove admin access from New Admin',
      }),
    )

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Access removed.')
  })
})
